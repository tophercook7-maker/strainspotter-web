# 🚀 Auto-Build Setup (GitHub Actions)

This will automatically build your Android APK whenever you push changes to the mobile app.

---

## ⚡ One-Time Setup (5 minutes)

### **Step 1: Get Your Expo Token**

Run this command:
```bash
npx expo login
npx eas whoami
npx eas build:configure
```

Then get your token:
```bash
npx expo token:create
```

**Copy the token** that appears (starts with `ey...`)

---

### **Step 2: Add Token to GitHub**

1. Go to: https://github.com/tophercook7-maker/StrainSpotter/settings/secrets/actions

2. Click **"New repository secret"**

3. Name: `EXPO_TOKEN`

4. Value: Paste the token you copied

5. Click **"Add secret"**

---

## ✅ That's It!

Now whenever you push changes to `StrainSpotterMobile/`, GitHub will:

1. ✅ Automatically build Android APK
2. ✅ Upload to Expo dashboard
3. ✅ Send you a notification when ready

---

## 📱 Download Your APK

After pushing, wait 10-15 minutes, then:

**Go to:** https://expo.dev/accounts/topher1/projects/strainspotter/builds

**Download** the latest APK and install on your phone!

---

## 🔄 Manual Build (Optional)

You can also trigger a build manually:

1. Go to: https://github.com/tophercook7-maker/StrainSpotter/actions

2. Click **"Build Mobile App"**

3. Click **"Run workflow"**

4. Click **"Run workflow"** again

---

## 🌿 Easy Mode Activated!

Just push your code and GitHub builds it for you! ✨

