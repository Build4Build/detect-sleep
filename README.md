# Sleep Detector

A React Native Expo app that automatically tracks your sleep patterns based on phone usage.

## Features

- **Automatic Sleep Detection**: The app detects when you're asleep based on phone inactivity
- **Sleep Statistics**: View detailed statistics about your sleep patterns
- **Sleep History**: Browse your sleep history with daily summaries
- **Data Export**: Export your sleep data in JSON or CSV format
- **Customizable Settings**: Adjust the inactivity threshold to match your habits

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

## Screenshots Generator

### Using the Screenshot Generator Script

The app includes a helpful script for generating App Store and Google Play Store screenshots. This script uses ImageMagick to create professional-looking screenshots with frames, titles and descriptions.

#### Prerequisites

- ImageMagick must be installed on your system
  ```bash
  # For macOS:
  brew install imagemagick
  
  # For Linux:
  sudo apt-get install imagemagick
  ```

#### Running the Script

1. Make the script executable if it's not already:
   ```bash
   chmod +x generate-screenshots.sh
   ```

2. Run the script:
   ```bash
   ./generate-screenshots.sh
   ```

3. The script will:
   - Create an `assets/screenshots` directory if it doesn't exist
   - Generate placeholder screenshots with professional layouts
   - Add device frames, titles, and app mockups

#### Customizing Screenshots

The script generates template screenshots that you need to customize:

1. Replace the placeholder images with actual app screenshots:
   - Take screenshots of your app in different screens
   - Replace the placeholder mockups in each generated screenshot
   
2. Customize text and colors:
   - Open the script to edit titles, subtitles, and accent colors
   - Modify the `create_screenshot` function calls at the bottom of the script

3. Add device frames:
   - For iOS: Use Apple's Marketing Resources (https://developer.apple.com/app-store/marketing/guidelines/#section-products)
   - For Android: Use Google's Device Art Generator

#### Output

The script creates 5 screenshots in the `assets/screenshots` directory:
1. Sleep Tracking screen
2. Detailed Analytics screen
3. Sleep History screen
4. Export Data screen
5. Settings screen

These screenshots will need further customization with your actual app content before submission.

### Preparing Store Assets

After generating screenshots, make sure to prepare all required store assets:

1. Resize screenshots for all required dimensions:
   - iOS: 6.5", 5.5", and 12.9" iPad Pro dimensions
   - Android: Phone, 7-inch tablet, and 10-inch tablet dimensions

2. Create promotional images:
   - App Store: 1024x1024 icon
   - Google Play: 512x512 icon and 1024x500 feature graphic

You can find the complete list of requirements in the STORE_LISTING_CONTENT.md file.

## Adding Home Screen Widget (Future Enhancement)

To add a home screen widget, you'll need to:

1. **Eject to a bare workflow** or use **EAS Build** with custom native code
2. **Create a native iOS Widget Extension** using WidgetKit
3. **Share data** between your app and widget using App Groups

This requires iOS native development skills and is planned for a future version.

## Publishing Your App

### iOS App Store Submission

#### 1. Prepare Your App
- Verify all features work correctly
- App icons and splash screen are ready
- Privacy policy is up-to-date
- App.json is configured properly (see example below)

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.sleepdetector.app",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSMotionUsageDescription": "This app uses motion data to determine if you're sleeping",
        "NSHealthShareUsageDescription": "This app uses health data to improve sleep detection",
        "UIBackgroundModes": ["fetch", "processing"]
      }
    }
  }
}
```

#### 2. Create App in App Store Connect
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to "My Apps" > "+" > "New App"
3. Fill in required information:
   - Platform: iOS
   - Name: Sleep Detector
   - Primary language: English
   - Bundle ID: com.sleepdetector.app (matching app.json)
   - SKU: sleepdetector
   - User Access: Full Access

#### 3. Generate Store Assets
1. Run the screenshot generator script:
   ```bash
   ./generate-screenshots.sh
   ```
2. Customize screenshots for all required dimensions:
   - iPhone 6.5" (1242×2688 px)
   - iPhone 5.5" (1242×2208 px)
   - iPad Pro 12.9" (2048×2732 px)
3. Prepare app icon (1024×1024 px)

#### 4. Build for App Store
```bash
eas build --platform ios --profile production
```

#### 5. Submit to App Store
Once your build is complete:
```bash
eas submit -p ios --latest
```

You'll need to provide:
- Your Apple ID email
- App-specific password (if 2FA is enabled)
- App Store Connect App ID

#### 6. Complete App Store Information
After submission, log in to App Store Connect to complete:
- App metadata (using STORE_LISTING_CONTENT.md as reference)
- Privacy policy URL
- Support URL
- App Store screenshots
- Age ratings
- App Review Information (test account if needed)

#### 7. Submit for Review
Click "Submit for Review" when all sections are complete. Apple typically takes 1-3 days to review your app.

### Google Play Store Submission

#### 1. Prepare Your App
- Verify all features work correctly
- App icons and splash screen are ready
- Privacy policy is up-to-date
- App.json is configured properly (see example below)

```json
{
  "expo": {
    "android": {
      "package": "com.sleepdetector.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": ["ACTIVITY_RECOGNITION"]
    }
  }
}
```

#### 2. Create App in Google Play Console
1. Log in to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in required information:
   - App name: Sleep Detector
   - Default language: English
   - App or Game: App
   - Free or Paid: Free
   - Confirm developer program policies

#### 3. Generate Store Assets
1. Run the screenshot generator script:
   ```bash
   ./generate-screenshots.sh
   ```
2. Customize screenshots for all required dimensions:
   - Phone screenshots (1080×1920 px)
   - 7-inch tablet (1200×1920 px)
   - 10-inch tablet (1920×2560 px)
3. Prepare:
   - High-res icon (512×512 px)
   - Feature graphic (1024×500 px)

#### 4. Build for Google Play
```bash
eas build --platform android --profile production
```

#### 5. Complete Play Store Listing
In Google Play Console:
- Store listing (using STORE_LISTING_CONTENT.md)
- Upload all graphics and screenshots
- Content rating (complete questionnaire)
- Pricing & distribution
- App releases

#### 6. Submit to Google Play
1. Create a new release in the "Production" track
2. Upload your AAB file (from EAS build)
3. Add release notes
4. Save and review release
5. Start rollout to production

Google typically reviews apps within 1-7 days.

## Privacy

Your sleep data is stored locally on your device. The app does not send your data to any servers unless you explicitly use the export feature to share it.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React Native and Expo
- Uses AsyncStorage for data persistence
- Charts powered by react-native-chart-kit 