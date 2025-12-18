// Supabase Edge Function: try-me
// Enforces 2-use limit per device (anonymous) or user, runs Vision + strain match, returns results
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY")!;
const STRAIN_LIBRARY_URL = Deno.env.get("STRAIN_LIBRARY_URL")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getUserId(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user?.id || null;
}

function getDeviceId(req: Request): string {
  // Use device fingerprint from headers or body for anonymous trial tracking
  const deviceHeader = req.headers.get("x-device-id");
  return deviceHeader || "anonymous";
}

async function getUsage(userId: string | null, deviceId: string) {
  // Check user membership first if logged in
  if (userId) {
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (user?.user?.user_metadata?.membership === 'club') {
      return -1; // unlimited for members
    }
  }
  
  // Check trial usage by user or device
  const key = userId || deviceId;
  const { data, error } = await supabase
    .from("try_me_usage")
    .select("count")
    .eq("identifier", key)
    .single();
  return data?.count || 0;
}

async function incrementUsage(userId: string | null, deviceId: string) {
  const key = userId || deviceId;
  const { data, error } = await supabase
    .from("try_me_usage")
    .select("count")
    .eq("identifier", key)
    .single();
  
  if (error || !data) {
    // First use: insert
    await supabase.from("try_me_usage").insert({ identifier: key, count: 1, user_id: userId });
  } else {
    // Increment
    await supabase.from("try_me_usage").update({ count: data.count + 1 }).eq("identifier", key);
  }
}

async function runVision(base64: string) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
  const body = {
    requests: [{
      image: { content: base64 },
      features: [
        { type: "LABEL_DETECTION", maxResults: 50 },
        { type: "WEB_DETECTION", maxResults: 10 },
        { type: "IMAGE_PROPERTIES" },
      ]
    }]
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return json.responses?.[0] || {};
}

async function getStrainLibrary() {
  const res = await fetch(STRAIN_LIBRARY_URL);
  return await res.json();
}

function matchStrain(visionResult: any, strains: any[]) {
  // Simple color/label match (stub)
  const labels = (visionResult.labelAnnotations || []).map((l: any) => l.description.toLowerCase());
  const color = visionResult.imagePropertiesAnnotation?.dominantColors?.colors?.[0]?.color || {};
  // Example: match by label
  return strains.filter(s => labels.some(l => s.name.toLowerCase().includes(l))).slice(0, 5);
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  
  const userId = await getUserId(req);
  const { base64, deviceId: bodyDeviceId } = await req.json();
  const deviceId = bodyDeviceId || getDeviceId(req);
  
  if (!base64) return new Response(JSON.stringify({ error: "No image provided" }), { status: 400 });

  const usage = await getUsage(userId, deviceId);
  
  // Unlimited for club members
  if (usage === -1) {
    const visionResult = await runVision(base64);
    const strains = await getStrainLibrary();
    const matches = matchStrain(visionResult, strains);
    
    return new Response(JSON.stringify({
      message: "Scan complete",
      membership: "club",
      unlimited: true,
      vision: visionResult,
      matches
    }), { status: 200 });
  }
  
  // Trial limit enforcement
  if (usage >= 2) {
    return new Response(JSON.stringify({ 
      error: "Trial limit reached", 
      code: "TRIAL_LIMIT", 
      remaining_uses: 0, 
      message: "Join StrainSpotter Club for unlimited scans and all features"
    }), { status: 402 });
  }

  const visionResult = await runVision(base64);
  const strains = await getStrainLibrary();
  const matches = matchStrain(visionResult, strains);

  await incrementUsage(userId, deviceId);
  
  return new Response(JSON.stringify({
    message: "Try-me scan complete",
    remaining_uses: 2 - usage - 1,
    trialUsed: true,
    vision: visionResult,
    matches
  }), { status: 200 });
});
