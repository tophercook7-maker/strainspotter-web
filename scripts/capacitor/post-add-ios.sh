#!/usr/bin/env bash
# scripts/capacitor/post-add-ios.sh
#
# Run AFTER `npx cap add ios` and BEFORE `pod install`. Patches the
# Capacitor-generated Podfile + xcodeproj to use iOS 15 minimum, which
# is what Capacitor 8 requires. Without this, `pod install` fails with
# "higher minimum deployment target".
#
# Idempotent — safe to run multiple times.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PODFILE="$ROOT/ios/App/Podfile"
PBXPROJ="$ROOT/ios/App/App.xcodeproj/project.pbxproj"

if [ ! -f "$PODFILE" ]; then
  echo "ERROR: $PODFILE not found. Run 'npx cap add ios' first."
  exit 1
fi

echo "→ Patching Podfile platform to iOS 15.0…"
/usr/bin/sed -i.bak "s/^platform :ios, '14\.0'$/platform :ios, '15.0'/" "$PODFILE"
rm -f "$PODFILE.bak"

if ! grep -q "IPHONEOS_DEPLOYMENT_TARGET'\] = '15.0'" "$PODFILE"; then
  echo "→ Inserting post_install deployment-target enforcement…"
  /usr/bin/sed -i.bak "s/^  assertDeploymentTarget(installer)$/  assertDeploymentTarget(installer)\\
  installer.pods_project.targets.each do |target|\\
    target.build_configurations.each do |config|\\
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'\\
    end\\
  end/" "$PODFILE"
  rm -f "$PODFILE.bak"
fi

echo "→ Patching xcodeproj IPHONEOS_DEPLOYMENT_TARGET to 15.0…"
/usr/bin/sed -i.bak 's/IPHONEOS_DEPLOYMENT_TARGET = 14\.0;/IPHONEOS_DEPLOYMENT_TARGET = 15.0;/g' "$PBXPROJ"
rm -f "$PBXPROJ.bak"

echo "→ Running pod install…"
cd "$ROOT/ios/App"
pod install

echo ""
echo "✓ Done. Now run: open ios/App/App.xcworkspace"
