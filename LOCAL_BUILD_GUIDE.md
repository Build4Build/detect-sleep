# Local iOS Build Guide - Sleep Detector

## 🎯 Current Situation
- EAS free tier limit reached
- Need to build locally for App Store submission
- All validation issues have been fixed

## 🛠️ Local Build Options

### Option 1: EAS Local Build (Recommended)
```bash
# Build locally using EAS
eas build --local --platform ios

# This will:
# - Build on your local machine
# - Use your local Xcode installation
# - Generate a .ipa file for App Store submission
```

### Option 2: Direct Xcode Build
```bash
# Navigate to iOS project
cd ios

# Install pods
pod install

# Open Xcode project
open SleepDetector.xcworkspace

# Then build and archive in Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Upload to App Store Connect
```

### Option 3: Expo CLI (Alternative)
```bash
# Using traditional Expo CLI
npx expo run:ios --configuration Release

# Note: This may require additional setup
```

## 📋 Prerequisites for Local Building

### Required Software:
- ✅ Xcode (latest version recommended)
- ✅ iOS Simulator
- ✅ CocoaPods
- ✅ Valid Apple Developer Account

### Check Prerequisites:
```bash
# Check Xcode
xcode-select --print-path

# Check CocoaPods
pod --version

# Check iOS Simulators
xcrun simctl list devices
```

## 🔧 Local Build Steps

### Step 1: Prepare Environment
```bash
cd /Users/pierre-henrysoria/Code/detect-sleep

# Make sure pods are installed
cd ios && pod install && cd ..

# Ensure latest EAS CLI
sudo npm install -g eas-cli@latest
```

### Step 2: Start Local Build
```bash
# Build locally
eas build --local --platform ios

# Follow prompts for Apple credentials
# This will generate a .ipa file
```

### Step 3: Submit to App Store
```bash
# After local build completes, find the .ipa file
# Usually in build output directory

# Submit using EAS
eas submit --platform ios --path /path/to/your/app.ipa

# Or upload manually via Xcode or Application Loader
```

## 🚀 Alternative: Direct Xcode Workflow

### Step 1: Open in Xcode
```bash
cd ios
open SleepDetector.xcworkspace
```

### Step 2: Configure Signing
1. Select SleepDetector project
2. Go to Signing & Capabilities
3. Ensure your Apple Developer Team is selected
4. Bundle Identifier: `com.sleepdetector.app`

### Step 3: Archive and Upload
1. Select "Any iOS Device" as target
2. Product → Archive
3. When archive completes, click "Distribute App"
4. Select "App Store Connect"
5. Follow the upload wizard

## 📱 Current Build Configuration

### Version Info:
- **App Version**: 1.1.0
- **Build Number**: 49 (auto-incremented)
- **Bundle ID**: com.sleepdetector.app

### Fixed Issues:
- ✅ UIBackgroundModes corrected
- ✅ CFBundleIconName added
- ✅ All app icon sizes generated
- ✅ Health Kit errors resolved

## 🔍 Troubleshooting Local Builds

### Common Issues:

#### 1. Code Signing Errors
```bash
# Clean and rebuild
cd ios
rm -rf build/
rm -rf Pods/
pod install
```

#### 2. Missing Certificates
- Download certificates from Apple Developer portal
- Or let EAS handle it with Apple credentials

#### 3. Pod Installation Issues
```bash
cd ios
pod deintegrate
pod install
```

#### 4. Xcode Version Issues
```bash
# Update Xcode command line tools
sudo xcode-select --install
```

### Build Locations:
- **EAS Local**: Check terminal output for .ipa location
- **Xcode Archive**: `~/Library/Developer/Xcode/Archives/`

## 📤 Submission After Local Build

### Using EAS Submit:
```bash
# Submit the locally built IPA
eas submit --platform ios --path /path/to/SleepDetector.ipa
```

### Using Xcode:
1. Archive in Xcode
2. Use built-in App Store upload
3. Monitor upload in App Store Connect

### Using Application Loader:
```bash
# If you have the .ipa file
xcrun altool --upload-app --file SleepDetector.ipa --username your@email.com --password app-specific-password
```

## ✅ Ready for Submission Checklist

- [ ] Local build completes successfully
- [ ] All validation errors resolved
- [ ] App icons present and correct
- [ ] Info.plist properly configured
- [ ] .ipa file generated
- [ ] Uploaded to App Store Connect
- [ ] App metadata configured
- [ ] Screenshots uploaded
- [ ] Submitted for review

---

## 🎉 You're Almost There!

Your app is ready for local building and App Store submission. All the technical issues have been resolved:

1. Health service errors fixed
2. Notification cleanup completed
3. App icons generated
4. Info.plist corrected
5. Version incremented

Just complete the local build and submit! 🚀
