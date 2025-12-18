# 📱 Mobile Hot-Reload Setup Guide for StrainSpotter

**Date:** November 7, 2025  
**Goal:** Set up Xcode hot-reloading for your production StrainSpotter frontend

---

## 🎯 Current Situation

You have **two separate codebases**:

1. **`~/Projects/StrainSpotter/frontend/`** ⭐ **Production web app**
   - Full StrainSpotter with all 54 components
   - Garden, Scanner, Groups, GrowCoach, etc.
   - **NO Capacitor/iOS setup yet**

2. **`~/Projects/StrainSpotter/StrainSpotter_Starter_Integrated_v5/`** 🧪 **Simple CLIP demo**
   - Standalone image matching app
   - Single `StrainSpotterApp.jsx` file
   - **Has Capacitor/iOS setup**
   - **NOT your production app**

---

## ✅ Solution: Add Capacitor to Production Frontend

We'll add Capacitor to your production frontend so you can use Xcode for hot-reloading.

---

## 📋 Step-by-Step Setup

### Step 1: Install Capacitor in Production Frontend

\`\`\`bash
cd ~/Projects/StrainSpotter/frontend

# Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios

# Initialize Capacitor
npx cap init
\`\`\`

**When prompted:**
- App name: \`StrainSpotter\`
- App ID: \`com.strainspotter.app\` (or your preferred bundle ID)
- Web asset directory: \`dist\`

---

### Step 2: Add iOS Platform

\`\`\`bash
cd ~/Projects/StrainSpotter/frontend

# Build the frontend first
npm run build

# Add iOS platform
npx cap add ios

# Sync web assets to iOS
npx cap sync
\`\`\`

This will create \`frontend/ios/\` folder with Xcode project.

---

### Step 3: Configure for Hot-Reload

Edit \`frontend/capacitor.config.ts\` (created by \`npx cap init\`):

\`\`\`typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.strainspotter.app',
  appName: 'StrainSpotter',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // For hot-reload during development
    url: 'http://localhost:5173',
    cleartext: true
  }
}

export default config
\`\`\`

---

### Step 4: Open in Xcode

\`\`\`bash
cd ~/Projects/StrainSpotter/frontend
npx cap open ios
\`\`\`

This opens Xcode with your StrainSpotter app!

---

## 🔥 Hot-Reload Workflow

### Daily Development:

\`\`\`bash
# Terminal 1: Start Vite dev server
cd ~/Projects/StrainSpotter/frontend
npm run dev

# Terminal 2: Open Xcode (first time only)
npx cap open ios

# Then in Xcode:
# - Click Run to launch app
# - Edit code in VS Code
# - See changes hot-reload in iOS app!
\`\`\`

---

## 🛠️ Quick Commands

\`\`\`bash
# Install Capacitor
cd ~/Projects/StrainSpotter/frontend
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Initialize
npx cap init

# Build and add iOS
npm run build
npx cap add ios

# Sync changes
npx cap sync

# Open in Xcode
npx cap open ios
\`\`\`

---

**Ready to set this up? Let me know and I'll run the commands for you!**
