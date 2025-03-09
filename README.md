# Sleep Detector

A React Native Expo app that automatically tracks your sleep patterns based on phone usage.

## Features

- **Automatic Sleep Detection**: The app detects when you're asleep based on phone inactivity
- **Sleep Statistics**: View detailed statistics about your sleep patterns
- **Sleep History**: Browse your sleep history with daily summaries
- **Data Export**: Export your sleep data in JSON or CSV format
- **Customizable Settings**: Adjust the inactivity threshold to match your habits
- **Home Screen Widget**: View your sleep status and today's sleep duration at a glance

## How It Works

The app monitors your phone usage to determine when you're awake or asleep:

1. When you use your phone, the app considers you awake
2. When your phone remains inactive for a set period (default: 45 minutes), the app considers you asleep
3. The app records these state changes to build a picture of your sleep patterns

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- iOS or Android device/emulator

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/detect-sleep.git
cd detect-sleep
```

2. Install dependencies:
```
npm install
```

3. Start the Expo development server:
```
npx expo start
```

4. Open the app on your device using the Expo Go app or run it in an emulator.

## Usage

### Today Screen

The Today screen shows your current sleep status and a timeline of your activity for the day. You can see at a glance how much sleep you've gotten so far today.

### History Screen

Browse through your sleep history day by day. See when you fell asleep and woke up, and how much total sleep you got each day.

### Stats Screen

View statistics about your sleep patterns, including:
- Average sleep duration
- Sleep consistency
- Sleep quality metrics
- Visual charts of your sleep patterns

### Settings

Customize the app to match your habits:
- Adjust the inactivity threshold (how long before the app considers you asleep)
- Enable/disable notifications
- Manage your data

## Testing and Deployment

### Running Tests Locally

1. Test on iOS simulator:
```bash
npm run ios
```

2. Test on Android emulator:
```bash
npm run android
```

3. Test on your physical device by scanning the QR code from the Expo Go app after running:
```bash
npx expo start
```

### Testing the Widget

1. Install a development build on your iOS device:
```bash
npx eas build --platform ios --profile development
```

2. Once installed:
   - Long press on your home screen
   - Tap the "+" button in the top corner
   - Find "Sleep Detector" in the widget gallery
   - Add the widget to your home screen
   - Verify that it shows your current sleep status and today's sleep duration

### Generating App Icons

You can use the included script to generate app icons:
```bash
chmod +x build-deploy.sh
./build-deploy.sh
# Select option 5 (Generate app icons)
```

Or manually create these required assets in the `assets` folder:
- `icon.png` (1024×1024 px)
- `splash.png` (1242×2436 px)
- `adaptive-icon.png` (1024×1024 px) 
- `favicon.png` (192×192 px)

## Publishing to App Store

### 1. Prepare Your App

Make sure your app is ready for submission:
- All features work correctly
- App icons and splash screen are in place
- The privacy policy is up to date
- The widget displays correctly

### 2. Create Your App on App Store Connect

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to "My Apps" > "+" > "New App"
3. Fill in required information:
   - Platform: iOS
   - Name: Sleep Detector
   - Primary language: English
   - Bundle ID: com.sleepdetector.app (as specified in app.json)
   - SKU: sleepdetector
   - User Access: Full Access

### 3. Prepare App Store Metadata

Prepare your app's listing information:

1. **Screenshots** (minimum required):
   - iPhone 6.5" (1242×2688 px): 3 screenshots
   - iPhone 5.5" (1242×2208 px): 3 screenshots

2. **App Description**:
```
Sleep Detector automatically tracks your sleep patterns based on your phone usage.

FEATURES:
• Automatic sleep detection based on phone inactivity
• Beautiful sleep statistics and charts 
• Home screen widget showing sleep status
• Daily, weekly, and monthly history views
• Export your sleep data in multiple formats
• Customizable inactivity threshold

No login required. All data stays on your device.
```

3. **Keywords**:
```
sleep,tracker,monitor,pattern,health,widget,automatic,diary,journal,log,usage
```

### 4. Build for App Store

Use the included build script:
```bash
./build-deploy.sh
# Select option 3 (Build production version)
```

Or manually build with EAS:
```bash
npx eas build --platform ios --profile production
```

### 5. Submit to App Store

Use the included submission script:
```bash
./build-deploy.sh
# Select option 4 (Submit to App Store)
```

Or manually submit with EAS:
```bash
npx eas submit -p ios --latest
```

You'll need to provide:
- Your Apple ID email
- App Store Connect App ID (found in the URL when viewing your app)
- Apple Team ID (2V8LZ2444Y)

### 6. Monitor Review Status

After submission, your app will enter "Waiting for Review" status in App Store Connect. Apple's review process typically takes 1-3 days.

### 7. Handling Rejections

If your app is rejected:
1. Read the rejection reason carefully
2. Make the necessary changes to your code
3. Build a new version
4. Submit the updated build
5. Respond to the reviewer explaining the changes made

## Privacy

Your sleep data is stored locally on your device. The app does not send your data to any servers unless you explicitly use the export feature to share it.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React Native and Expo
- Uses AsyncStorage for data persistence
- Charts powered by react-native-chart-kit
- Home screen widget powered by expo-widgets 