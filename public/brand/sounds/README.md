# Botanical OS Boot Sounds

This directory contains audio files for the StrainSpotter OS boot sequence.

## Required Files

1. **startup.mp3** (MP3, 128kbps or higher)
   - Main boot sound
   - Duration: ~1-2 seconds
   - Volume: Normalized to -3dB
   - Format: MP3 (compatible with all browsers)

2. **startup.wav** (WAV, 44.1kHz, 16-bit)
   - High-quality fallback
   - Used when MP3 is not available

3. **startup.m4a** (AAC, 128kbps)
   - iOS/Safari optimized
   - Better compression than MP3

4. **startup.aif** (AIFF, 44.1kHz, 16-bit)
   - Desktop app fallback
   - Uncompressed quality

## Audio Specifications

- **Duration:** 1.5-2.0 seconds
- **Volume:** Normalized to -3dB (playback at 35% volume in app)
- **Style:** Subtle, professional, botanical-themed
- **Tone:** Soft chime or gentle startup sound
- **No harsh frequencies**

## Usage

The BootSound component will automatically select the best format based on browser support:
1. MP3 (primary)
2. M4A (Safari/iOS)
3. WAV (fallback)

## Generation

Audio files should be created using:
- Professional audio editing software (Audacity, Pro Tools, Logic)
- AI audio generation tools
- Or sourced from royalty-free sound libraries
