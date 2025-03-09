# Sleep Detector - Quick Start Guide for App Store Submission

## Before You Begin

Ensure you have:
- Mac computer with Xcode installed (latest version)
- Apple Developer Program account (Team ID: 2V8LZ2444Y)
- Node.js and npm installed
- EAS CLI installed: `npm install -g eas-cli`

## Step 1: Prepare Your App

### Install Dependencies
```bash
cd detect-sleep
npm install
```

### Generate App Icons
You can use the included script to generate app icons:
```bash
chmod +x build-deploy.sh
./build-deploy.sh
# Select option 5 (Generate app icons)
```

Or manually create:
- `assets/icon.png` (1024×1024 px)
- `assets/splash.png` (1242×2436 px)
- `assets/adaptive-icon.png` (1024×1024 px)
- `assets/favicon.png` (192×192 px)

## Step 2: Test Your App Locally

```bash
npm run ios
```

Test all features thoroughly, especially:
- Sleep tracking functionality
- Widget display and updates
- Data export options
- Settings screen

## Step 3: Create Your App on App Store Connect

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to "My Apps" > "+" > "New App"
3. Fill in required information:
   - Platform: iOS
   - Name: Sleep Detector
   - Primary language: English
   - Bundle ID: com.sleepdetector.app
   - SKU: sleepdetector
   - User Access: Full Access

## Step 4: Prepare App Store Metadata

### Screenshots (Minimum Required)
- iPhone 6.5" (1242×2688 px): 3 screenshots
- iPhone 5.5" (1242×2208 px): 3 screenshots

Show key features:
1. Today screen with sleep status
2. History/stats with charts
3. Widget on home screen

### App Description
```
Sleep Detector automatically tracks your sleep patterns based on your phone usage.

FEATURES:
• Automatic sleep detection based on phone inactivity
• Beautiful sleep statistics and charts 
• Home screen widget showing sleep status
• Daily, weekly, and monthly history views
• Export your sleep data in multiple formats
• Customizable inactivity threshold (when to consider you asleep)

No login required. All data stays on your device.
```

### Keywords
```
sleep,tracker,monitor,pattern,health,widget,automatic,diary,journal,log,usage
```

## Step 5: Build for App Store

```bash
./build-deploy.sh
# Select option 3 (Build production version)
```

## Step 6: Submit to App Store

```bash
./build-deploy.sh
# Select option 4 (Submit to App Store)
```

Fill in:
- Your Apple ID email
- App Store Connect App ID (found in App Store Connect URL)

## Additional Tips

### Testing the Widget
1. Install development build on device
2. Long press home screen > tap "+" > find "Sleep Detector" widget
3. Add widget to home screen
4. Check that it displays sleep data correctly

### Handling Rejections
If your app is rejected:
1. Read rejection reason thoroughly
2. Fix the issues in your code
3. Build new version and resubmit
4. Respond to reviewer explaining changes

### App Store Guidelines Most Relevant to Sleep Detector
- [2.1 Performance: App Completeness](https://developer.apple.com/app-store/review/guidelines/#app-completeness)
- [2.2 Performance: Beta Testing](https://developer.apple.com/app-store/review/guidelines/#beta-testing)
- [5.1 Legal: Privacy](https://developer.apple.com/app-store/review/guidelines/#privacy)
- [5.1.1 Data Collection and Storage](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) 