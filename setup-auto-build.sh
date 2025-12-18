#!/bin/bash

# StrainSpotter Auto-Build Setup Script
# This sets up GitHub Actions to automatically build your mobile app

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        🚀 StrainSpotter Auto-Build Setup 🚀                ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install gh
    else
        echo "Please install GitHub CLI: https://cli.github.com/"
        exit 1
    fi
fi

# Check if logged in to GitHub
echo "🔐 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "Please log in to GitHub:"
    gh auth login
fi
echo "✅ Logged in to GitHub"
echo ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

# Login to Expo
echo "🔐 Logging in to Expo..."
echo "Please enter your Expo credentials:"
npx expo login

# Create Expo token
echo ""
echo "🎫 Creating Expo access token..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "IMPORTANT: Copy the token that appears below!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create token and capture it
EXPO_TOKEN=$(npx eas build:configure --non-interactive 2>&1 | grep -o 'ey[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*' || echo "")

if [ -z "$EXPO_TOKEN" ]; then
    echo "Creating new token..."
    npx expo token:create --name "GitHub Actions Auto-Build"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Please copy the token above and paste it below:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    read -p "Expo Token: " EXPO_TOKEN
fi

# Add token to GitHub secrets
echo ""
echo "🔒 Adding token to GitHub secrets..."
echo "$EXPO_TOKEN" | gh secret set EXPO_TOKEN
echo "✅ Token added to GitHub!"
echo ""

# Commit and push the workflow
echo "📤 Pushing auto-build workflow to GitHub..."
git add .github/workflows/build-mobile-app.yml
git add SETUP_AUTO_BUILD.md
git add setup-auto-build.sh
git commit -m "Add GitHub Actions auto-build for mobile app" || echo "Already committed"
git push

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              ✅ AUTO-BUILD SETUP COMPLETE! ✅               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Your mobile app will now auto-build on every push!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 HOW IT WORKS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. You push changes to StrainSpotterMobile/"
echo "2. GitHub automatically builds Android APK (10-15 min)"
echo "3. Download from: https://expo.dev/accounts/topher1/projects/strainspotter/builds"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 MANUAL BUILD:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Go to: https://github.com/tophercook7-maker/StrainSpotter/actions"
echo "Click: 'Build Mobile App' → 'Run workflow'"
echo ""
echo "🌿 Happy building! ✨"
echo ""

