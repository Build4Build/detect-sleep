# Sleep Detector Mobile App 😴

**Sleep Detector** is a React Native Expo app that automatically tracks your sleep patterns based on phone usage.

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
- npm
- Expo CLI
- iOS or Android device/emulator

### Installation

1. Clone the repository:
```
git clone https://github.com/pH-7/detect-sleep.git
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

## Publishing Your App

### Prerequisites

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Log in to your Expo account:
```bash
eas login
```

3. Configure EAS Build:
```bash
eas build:configure
```

### iOS App Store Submission

#### 1. Configure EAS Build for iOS

Create or update `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.9.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDEFGHIJ"
      }
    }
  }
}
```

#### 2. Build for App Store

1. Update version in `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1",
      "bundleIdentifier": "com.yourcompany.sleepdetector"
    }
  }
}
```

2. Create production build:
```bash
eas build --platform ios --profile production
```

#### 3. Submit to App Store

1. Submit the build:
```bash
eas submit --platform ios --profile production
```

2. Complete App Store Connect information:
- App metadata
- Privacy policy URL
- Support URL
- Screenshots
- App Review Information

### Google Play Store Submission

#### 1. Configure EAS Build for Android

Update `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./path/to/service-account.json",
        "track": "production"
      }
    }
  }
}
```

#### 2. Build for Google Play

1. Update version in `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1,
      "package": "me.ph7.sleepdetector"
    }
  }
}
```

2. Create production build:
```bash
eas build --platform android --profile production
```

#### 3. Submit to Google Play

1. Submit the build:
```bash
eas submit --platform android --profile production
```

2. Complete Play Store listing:
- Store listing
- Content rating
- Pricing & distribution
- App releases

### Store Assets Requirements

#### iOS App Store
- App Icon: 1024x1024px
- Screenshots:
  - iPhone 6.5" Display: 1242x2688px
  - iPhone 5.5" Display: 1242x2208px
  - iPad Pro 12.9": 2048x2732px

#### Google Play Store
- App Icon: 512x512px
- Feature Graphic: 1024x500px
- Screenshots:
  - Phone: 1080x1920px
  - 7-inch Tablet: 1200x1920px
  - 10-inch Tablet: 1920x2560px

### Troubleshooting

1. Build Fails:
```bash
# Clear build cache
eas build:clear

# Try building again
eas build --platform ios --profile production
```

2. Submission Fails:
```bash
# Check build status
eas build:list

# View submission logs
eas submit --platform ios --profile production --verbose
```


## Who Built This Sleep Tracker Mobile App?

**Pierre-Henry Soria** — a **super passionate engineer** who loves automating content creation efficiently!
Enthusiast of YouTube, AI, learning, and—of course—writing!
Find me at [pH7.me](https://ph7.me)

Enjoying this project? **[Buy me a coffee](https://ko-fi.com/phenry)** (spoiler: I love almond extra-hot flat white coffees).

[![Pierre-Henry Soria](https://s.gravatar.com/avatar/a210fe61253c43c869d71eaed0e90149?s=200)](https://ph7.me "Pierre-Henry Soria’s personal website")

[![@phenrysay][x-icon]](https://x.com/phenrysay "Follow Me on X") [![YouTube Tech Videos][youtube-icon]](https://www.youtube.com/@pH7Programming "My YouTube Tech Channel") [![pH-7][github-icon]](https://github.com/pH-7 "Follow Me on GitHub") [![BlueSky](https://img.shields.io/badge/BlueSky-00A8E8?style=for-the-badge&logo=bluesky&logoColor=white)](https://bsky.app/profile/ph7s.bsky.social "Follow Me on BlueSky")


## Privacy First!

Your sleep data is always stored locally on your device. The app does not send your data to any servers unless you explicitly use the export feature to share it.

## License

**Sleep Detector** is generously distributed under the [MIT License](license.md).


<!-- GitHub's Markdown reference links -->
[x-icon]: https://img.shields.io/badge/x-000000?style=for-the-badge&logo=x
[github-icon]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[youtube-icon]: https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white
