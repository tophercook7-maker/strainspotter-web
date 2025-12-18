# 📱 StrainSpotter Mobile App Installer Guide

This guide will help you build standalone installers for Android and iOS.

---

## 🚀 Quick Start

### **Option 1: Interactive Script (Easiest)**

```bash
cd StrainSpotterMobile
./build-installers.sh
```

This will guide you through building Android APK or iOS IPA installers.

---

## 📋 Prerequisites

### **For Android APK:**
- ✅ Expo account (free)
- ✅ EAS CLI installed (script will install if needed)
- ⏱️ 10-15 minutes build time

### **For iOS IPA:**
- ✅ Expo account (free)
- ✅ Apple Developer account ($99/year)
- ✅ EAS CLI installed
- ⏱️ 15-20 minutes build time

---

## 🤖 Building Android APK

### **Method 1: Using the Script**
```bash
cd StrainSpotterMobile
./build-installers.sh
# Choose option 1 (Android APK)
```

### **Method 2: Manual Command**
```bash
cd StrainSpotterMobile
npm install -g eas-cli  # If not already installed
eas login               # If not already logged in
eas build --platform android --profile production
```

### **What You Get:**
- ✅ `.apk` file (50-80 MB)
- ✅ Can be installed directly on any Android phone
- ✅ No Google Play Store needed
- ✅ Share via download link or file transfer

---

## 🍎 Building iOS IPA

### **Method 1: Using the Script**
```bash
cd StrainSpotterMobile
./build-installers.sh
# Choose option 2 (iOS IPA)
```

### **Method 2: Manual Command**
```bash
cd StrainSpotterMobile
npm install -g eas-cli  # If not already installed
eas login               # If not already logged in
eas build --platform ios --profile production
```

### **What You Get:**
- ✅ `.ipa` file (60-100 MB)
- ⚠️ Requires Apple Developer account
- ✅ Distribute via TestFlight or App Store
- ✅ Professional app distribution

---

## 📦 After Building

### **1. Download Your Installer**

After the build completes, you'll get a link like:
```
https://expo.dev/accounts/YOUR_USERNAME/projects/strainspotter/builds
```

Go there and download your installer file.

### **2. Distribute to Users**

#### **Android APK:**
- Upload to your website
- Share via Google Drive, Dropbox, etc.
- Send directly via email/messaging
- Users install by opening the file

#### **iOS IPA:**
- Upload to TestFlight (beta testing)
- Submit to App Store (public release)
- Requires Apple Developer account

---

## 🔧 Build Profiles

We have 3 build profiles configured in \`eas.json\`:

### **1. Development**
```bash
eas build --platform android --profile development
```
- For testing on simulators/emulators
- Includes development tools
- Faster builds

### **2. Preview**
```bash
eas build --platform android --profile preview
```
- For internal testing
- Optimized but not production-ready
- Good for beta testers

### **3. Production** (Recommended)
```bash
eas build --platform android --profile production
```
- Fully optimized
- Ready for distribution
- Smallest file size

---

## 📱 Installation Instructions for Users

### **Android:**
1. Download the APK file
2. Open the file on your Android phone
3. Allow "Install from Unknown Sources" if prompted
4. Tap "Install"
5. Open StrainSpotter!

### **iOS:**
1. Install TestFlight app from App Store
2. Open the TestFlight invite link
3. Tap "Install"
4. Open StrainSpotter!

---

## 🎯 Build Configuration

The builds are configured in \`StrainSpotterMobile/eas.json\`

---

## 🔍 Troubleshooting

### **"EAS CLI not found"**
```bash
npm install -g eas-cli
```

### **"Not logged in to Expo"**
```bash
eas login
```

### **"Apple Developer account required"**
- iOS builds require a paid Apple Developer account ($99/year)
- Sign up at: https://developer.apple.com

### **"Build failed"**
- Check the build logs in the Expo dashboard
- Make sure all dependencies are installed
- Verify app.json configuration

---

## 📊 Build Times

| Platform | Build Time | File Size |
|----------|-----------|-----------|
| Android APK | 10-15 min | 50-80 MB |
| iOS IPA | 15-20 min | 60-100 MB |
| Both | 20-30 min | Combined |

---

## 🌿 Next Steps

After building your installers:

1. **Test the installer** on a real device
2. **Share with beta testers** for feedback
3. **Submit to app stores** (optional)
4. **Update regularly** with new features

---

## 🎉 You're Ready!

Your StrainSpotter mobile app can now be installed as a standalone app on phones and tablets!

Run the build script to get started:
```bash
cd StrainSpotterMobile
./build-installers.sh
```

🌿 Happy building! ✨
