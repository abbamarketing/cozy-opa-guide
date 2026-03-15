import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const falKey = Deno.env.get("FAL_AI_KEY")!;

    const payload = await req.json();
    console.log("Webhook payload status:", payload.status);

    const requestId = payload.request_id;
    if (!requestId) {
      return new Response(JSON.stringify({ error: "Missing request_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the profile by fal_request_id
    const { data: profile, error: profileError } = await supabase
      .from("client_photo_profiles")
      .select("id, user_id, trigger_word")
      .eq("fal_request_id", requestId)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found for request_id:", requestId);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if training failed
    if (payload.status === "FAILED" || payload.error) {
      await supabase
        .from("client_photo_profiles")
        .update({ training_status: "failed" })
        .eq("id", profile.id);

      console.error("Training failed:", payload.error);
      return new Response(JSON.stringify({ received: true, status: "failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract LoRA URL from the result
    const loraUrl = payload.payload?.diffusers_lora_file?.url
      || payload.output?.diffusers_lora_file?.url
      || payload.diffusers_lora_file?.url;

    if (!loraUrl) {
      console.error("No LoRA URL in webhook payload:", JSON.stringify(payload).slice(0, 500));
      await supabase
        .from("client_photo_profiles")
        .update({ training_status: "failed" })
        .eq("id", profile.id);

      return new Response(JSON.stringify({ received: true, status: "no_lora" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update with lora_url
    await supabase
      .from("client_photo_profiles")
      .update({
        lora_url: loraUrl,
        training_status: "generating_reference",
      })
      .eq("id", profile.id);

    const triggerWord = profile.trigger_word || "SUBJECTPERSON";

    // Generate canonical reference photo with trained LoRA via Fal.ai
    const referenceResponse = await fetch("https://fal.run/fal-ai/flux-lora", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `professional portrait photo of ${triggerWord}, neutral expression, looking directly at camera, plain white background, studio lighting, sharp focus, high resolution headshot`,
        negative_prompt: "blurry, distorted, cartoon, painting, illustration, bad anatomy, multiple people",
        loras: [{ path: loraUrl, scale: 1.0 }],
        num_images: 1,
        image_size: "portrait_4_3",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: true,
      }),
    });

    if (!referenceResponse.ok) {
      const errText = await referenceResponse.text();
      console.error("Reference generation failed:", errText);
      // Still mark as completed with lora but no reference image
      await supabase
        .from("client_photo_profiles")
        .update({ training_status: "completed" })
        .eq("id", profile.id);

      return new Response(JSON.stringify({ received: true, status: "completed_no_ref" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const referenceResult = await referenceResponse.json();
    const referenceImageUrl = referenceResult?.images?.[0]?.url;

    if (!referenceImageUrl) {
      await supabase
        .from("client_photo_profiles")
        .update({ training_status: "completed" })
        .eq("id", profile.id);

      return new Response(JSON.stringify({ received: true, status: "completed_no_ref" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download reference image and save to Supabase Storage
    const imageResponse = await fetch(referenceImageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    const storagePath = `${profile.user_id}/${profile.id}/canonical_reference.jpg`;
    await supabase.storage
      .from("studio-lora-references")
      .upload(storagePath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    // Get long-lived signed URL
    const { data: signedData } = await supabase.storage
      .from("studio-lora-references")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    // Mark profile as completed
    await supabase
      .from("client_photo_profiles")
      .update({
        reference_image_url: signedData?.signedUrl ?? referenceImageUrl,
        training_status: "completed",
      })
      .eq("id", profile.id);

    console.log("Training completed successfully for profile:", profile.id);

    return new Response(
      JSON.stringify({ received: true, status: "completed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("studio-train-lora-webhook error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
