import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as fal from "https://esm.sh/@fal-ai/serverless-client@0.15.0";
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

    fal.config({ credentials: Deno.env.get("FAL_AI_KEY")! });

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
      .createSignedUrl(zipPath, 60 * 60); // 1 hour

    if (!zipSignedData?.signedUrl) {
      throw new Error("Failed to create signed URL for training zip");
    }

    const triggerWord = "SUBJECTPERSON";

    // 4. Train LoRA via Fal.ai with zip URL string
    const trainingResult = await fal.subscribe("fal-ai/flux-lora-fast-training", {
      input: {
        images_data_url: zipSignedData.signedUrl,
        trigger_word: triggerWord,
        steps: 1000,
        rank: 16,
        learning_rate: 0.0004,
        multiresolution_training: true,
        subject_crop: true,
      },
      pollInterval: 5000,
      timeout: 300000,
    });

    if (!trainingResult?.diffusers_lora_file?.url) {
      throw new Error("LoRA training failed: no output URL");
    }

    const loraUrl = trainingResult.diffusers_lora_file.url;

    // 5. Update status and save lora_url
    await supabase
      .from("client_photo_profiles")
      .update({
        lora_url: loraUrl,
        trigger_word: triggerWord,
        training_status: "generating_reference",
      })
      .eq("id", profile_id);

    // 6. Generate canonical reference photo with trained LoRA
    const referenceResult = await fal.run("fal-ai/flux-lora", {
      input: {
        prompt: `professional portrait photo of ${triggerWord}, neutral expression, looking directly at camera, plain white background, studio lighting, sharp focus, high resolution headshot`,
        negative_prompt:
          "blurry, distorted, cartoon, painting, illustration, bad anatomy, multiple people",
        loras: [{ path: loraUrl, scale: 1.0 }],
        num_images: 1,
        image_size: "portrait_4_3",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: true,
      },
    });

    if (!referenceResult?.images?.[0]?.url) {
      throw new Error("Reference image generation failed");
    }

    const referenceImageUrl = referenceResult.images[0].url;

    // 7. Download reference image and save to Supabase Storage
    const imageResponse = await fetch(referenceImageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    const storagePath = `${user.id}/${profile_id}/canonical_reference.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("studio-lora-references")
      .upload(storagePath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 8. Get long-lived signed URL
    const { data: signedData } = await supabase.storage
      .from("studio-lora-references")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    // 9. Mark profile as completed
    await supabase
      .from("client_photo_profiles")
      .update({
        reference_image_url: signedData?.signedUrl ?? referenceImageUrl,
        training_status: "completed",
      })
      .eq("id", profile_id);

    return new Response(
      JSON.stringify({
        success: true,
        lora_url: loraUrl,
        reference_image_url: signedData?.signedUrl ?? referenceImageUrl,
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
