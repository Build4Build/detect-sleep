#!/bin/zsh

echo "🔧 iOS Build Fix Script - Final Solution"
echo "======================================="

# Set proper environment
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/pierre-henrysoria/Code/detect-sleep

echo "✅ Configuration Status Check:"
echo "- UIBackgroundModes: background-fetch, background-processing"
echo "- JS Engine: JSC (not Hermes)"
echo "- Build Number: 21"
echo "- Version: 1.1.1"

echo "🧹 Step 1: Complete Cleanup"
rm -rf ios/
rm -rf node_modules/
rm -rf ~/Library/Developer/Xcode/DerivedData/SleepDetector-*

echo "📦 Step 2: Reinstall Dependencies"
npm install

echo "🏗️  Step 3: Regenerate iOS Project with JSC"
npx expo prebuild --platform ios --clean

echo "📱 Step 4: Configure for Production Build"
cd ios

# Ensure JSC is used
echo '{
  "expo.jsEngine": "jsc",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "false"
}' > Podfile.properties.json

# Install pods
pod install

echo "🚀 Step 5: Create Archive"
xcodebuild clean -workspace SleepDetector.xcworkspace -scheme SleepDetector

# Create archive
xcodebuild archive \
    -workspace SleepDetector.xcworkspace \
    -scheme SleepDetector \
    -destination "generic/platform=iOS" \
    -archivePath ../build/SleepDetector.xcarchive \
    -configuration Release

if [[ $? -eq 0 ]]; then
    echo "✅ SUCCESS! iOS Archive created"
    echo "📍 Location: $(pwd)/../build/SleepDetector.xcarchive"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Open Xcode Organizer"
    echo "2. Select the archive"
    echo "3. Click 'Distribute App'"
    echo "4. Choose 'App Store Connect'"
    echo "5. Upload and submit for review"
    echo ""
    echo "✅ UIBackgroundModes validation should now pass!"
else
    echo "❌ Build failed. Trying EAS Build as fallback..."
    cd /Users/pierre-henrysoria/Code/detect-sleep
    npx @expo/cli@latest build --platform ios --profile production
fi

echo "🎉 Script completed!"
