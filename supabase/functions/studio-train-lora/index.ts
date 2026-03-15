import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const falKey = Deno.env.get("FAL_AI_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { photo_urls, profile_id } = await req.json() as {
      photo_urls: string[];
      profile_id: string;
    };

    // 1. Update status to 'training'
    await supabase
      .from("client_photo_profiles")
      .update({ training_status: "training" })
      .eq("id", profile_id)
      .eq("user_id", user.id);

    // 2. Download all photos and create a zip file
    const zip = new JSZip();
    for (let i = 0; i < photo_urls.length; i++) {
      const response = await fetch(photo_urls[i]);
      if (!response.ok) throw new Error(`Failed to download photo ${i + 1}`);
      const buffer = await response.arrayBuffer();
      zip.file(`photo_${i + 1}.jpg`, buffer);
    }

    const zipBlob = await zip.generateAsync({ type: "uint8array" });

    // 3. Upload zip to Supabase Storage and get a signed URL
    const zipPath = `${user.id}/${profile_id}/training_photos.zip`;
    const { error: zipUploadError } = await supabase.storage
      .from("studio-reference-photos")
      .upload(zipPath, zipBlob, {
        contentType: "application/octet-stream",
        upsert: true,
      });
    if (zipUploadError) throw zipUploadError;

    const { data: zipSignedData } = await supabase.storage
      .from("studio-reference-photos")
      .createSignedUrl(zipPath, 60 * 60);

    if (!zipSignedData?.signedUrl) {
      throw new Error("Failed to create signed URL for training zip");
    }

    const triggerWord = "SUBJECTPERSON";

    // 4. Submit LoRA training via Fal.ai queue (non-blocking)
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/studio-train-lora-webhook`;

    const queueResponse = await fetch("https://queue.fal.run/fal-ai/flux-lora-fast-training", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          images_data_url: zipSignedData.signedUrl,
          trigger_word: triggerWord,
          steps: 1000,
          rank: 16,
          learning_rate: 0.0004,
          multiresolution_training: true,
          subject_crop: true,
        },
        webhook: webhookUrl,
      }),
    });

    if (!queueResponse.ok) {
      const errBody = await queueResponse.text();
      throw new Error(`Fal queue submit failed: ${queueResponse.status} ${errBody}`);
    }

    const queueResult = await queueResponse.json();
    const requestId = queueResult.request_id;

    if (!requestId) {
      throw new Error("No request_id returned from fal.ai queue");
    }

    // 5. Save request_id and trigger_word to profile for webhook to use later
    await supabase
      .from("client_photo_profiles")
      .update({
        fal_request_id: requestId,
        trigger_word: triggerWord,
        training_status: "training",
      })
      .eq("id", profile_id);

    // Return immediately — webhook will handle the rest
    return new Response(
      JSON.stringify({
        success: true,
        status: "training",
        request_id: requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("studio-train-lora error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
