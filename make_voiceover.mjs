import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function makeVoice() {
  const script = `Welcome to StrainSpotter… the world's most advanced cannabis identification system.

Snap a photo—unlock the strain.

Explore effects, flavors, grow advice, and real community insight.

Your cannabis journey begins here.`;

  const response = await client.audio.speech.create({
    model: "tts-1",  // Using tts-1 (gpt-4o-mini-tts may not be available)
    voice: "alloy",  // Alloy-Cool
    input: script,
    format: "mp3"
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Save to public/audio/voice-demo.mp3
  const outputPath = path.join(process.cwd(), "public", "audio", "voice-demo.mp3");
  fs.writeFileSync(outputPath, buffer);
  
  console.log("🎧 MP3 generated → public/audio/voice-demo.mp3");
}

// Run the function
makeVoice().catch(console.error);
