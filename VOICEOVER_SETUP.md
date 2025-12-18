# Voiceover Generation Setup

## Prerequisites

✅ OpenAI package is already installed

## Steps to Generate Voiceover

1. **Set your OpenAI API key** (one of these methods):

   **Option A: Environment variable (recommended)**
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   node make_voiceover.js
   ```

   **Option B: Inline (temporary)**
   ```bash
   OPENAI_API_KEY="sk-your-key-here" node make_voiceover.js
   ```

   **Option C: Create a `.env` file** (if using dotenv)
   ```bash
   echo "OPENAI_API_KEY=sk-your-key-here" > .env
   ```

2. **Run the script:**
   ```bash
   node make_voiceover.mjs
   ```

3. **Output:**
   The MP3 will be saved to: `public/audio/voice-demo.mp3`

## Notes

- The script uses OpenAI's TTS API with the "alloy" voice
- Model: `tts-1` (standard TTS model)
- Format: MP3
- The generated file will automatically work with the VoiceDemo component

## Troubleshooting

If you get "Cannot use import statement outside a module":
- Make sure you're using Node.js 14+ with ES modules support
- Or rename the file to `make_voiceover.mjs`
