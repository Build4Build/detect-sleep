# Push Notification Setup Guide 📱

This guide will help you configure push notifications for both iOS and Android platforms in the Sleep Detector app.

## 🎯 Overview

The Sleep Detector app uses push notifications to:
- **Sleep Detection**: Notify when inactivity-based sleep is detected
- **Wake Detection**: Show sleep summary when you wake up
- **Bedtime Reminders**: Daily reminders to maintain consistent sleep schedules

## 📋 Prerequisites

Before setting up push notifications, ensure you have:

- ✅ Expo CLI installed (`npm install -g @expo/cli`)
- ✅ EAS CLI installed (`npm install -g eas-cli`)
- ✅ Apple Developer account (for iOS)
- ✅ Google Cloud Console account (for Android)

## 🍎 iOS Configuration

### Step 1: Apple Developer Setup

1. **Log in to Apple Developer Console**
   - Go to [developer.apple.com](https://developer.apple.com)
   - Navigate to Certificates, Identifiers & Profiles

2. **Create/Update App Identifier**
   ```
   Bundle ID: com.sleepdetector.app
   Capabilities: Push Notifications (enabled)
   ```

3. **Generate APNs Key**
   - Go to Keys section
   - Create new key with Apple Push Notifications service (APNs)
   - Download the `.p8` file and note the Key ID

### Step 2: EAS Configuration

1. **Configure EAS Credentials**
   ```bash
   eas credentials:configure --platform ios
   ```

2. **Upload APNs Key**
   - Select "Push Notifications service key"
   - Upload your `.p8` file
   - Enter Key ID and Team ID

### Step 3: App.json Configuration

The iOS configuration in `app.json` should include:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.sleepdetector.app",
      "infoPlist": {
        "BGTaskSchedulerPermittedIdentifiers": [
          "com.sleepdetector.app.sleeprefresh",
          "com.sleepdetector.app.sleepprocessing",
          "background-activity-monitor"
        ]
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2196F3"
        }
      ]
    ]
  }
}
```

## 🤖 Android Configuration

### Step 1: Firebase Setup

1. **Create Firebase Project**
   - Go to [console.firebase.google.com](https://console.firebase.google.com)
   - Create new project or use existing
   - Add Android app with package name: `com.sleepdetector.app`

2. **Download Configuration**
   - Download `google-services.json`
   - Place it in your project root (EAS will handle it automatically)

3. **Enable Cloud Messaging**
   - In Firebase Console, go to Project Settings
   - Navigate to Cloud Messaging tab
   - Note the Server Key for later use

### Step 2: EAS Configuration

1. **Configure EAS Credentials**
   ```bash
   eas credentials:configure --platform android
   ```

2. **Upload FCM Server Key**
   - Select "Push Notifications: FCM server key"
   - Enter your Firebase Cloud Messaging server key

### Step 3: App.json Configuration

The Android configuration should include:

```json
{
  "expo": {
    "android": {
      "package": "com.sleepdetector.app",
      "permissions": [
        "android.permission.ACTIVITY_RECOGNITION",
        "android.permission.WAKE_LOCK",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.FOREGROUND_SERVICE"
      ]
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2196F3"
        }
      ]
    ]
  }
}
```

## 🔧 Code Implementation

### Notification Service Integration

The app includes a comprehensive notification service (`NotificationService.ts`) that handles:

```typescript
// Initialize notifications
const notificationService = NotificationService.getInstance();
await notificationService.initialize();

// Send sleep detection notification
await notificationService.notifySleepDetected(inactiveMinutes);

// Send wake detection notification
await notificationService.notifyWakeDetected(sleepDuration, sleepQuality);

// Schedule bedtime reminders
await notificationService.scheduleBedtimeReminder();
```

### Permission Handling

The service automatically requests permissions:

```typescript
// For iOS/Android
const { status } = await Notifications.requestPermissionsAsync();

// For Android - create notification channels
await Notifications.setNotificationChannelAsync('sleep-detection', {
  name: 'Sleep Detection',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#2196F3'
});
```

## 🚀 Testing Notifications

### Local Testing

1. **Use Physical Device**
   ```bash
   npx expo start
   # Scan QR code with Expo Go app
   ```

2. **Test Notification Features**
   - Go to Settings → Notification Settings
   - Use "Send Test Notification" button
   - Verify notifications appear correctly

### Production Testing

1. **Build with EAS**
   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

2. **Test on TestFlight/Internal Testing**
   - Submit to TestFlight (iOS) or Internal Testing (Android)
   - Install and test notification functionality

## 🔍 Troubleshooting

### Common Issues

#### iOS Issues

1. **"Push token not received"**
   - Ensure you're testing on a physical device
   - Check Apple Developer account status
   - Verify APNs key is correctly uploaded

2. **Notifications not appearing**
   - Check device notification settings
   - Verify app has notification permissions
   - Test with TestFlight build

#### Android Issues

1. **Firebase configuration errors**
   - Ensure `google-services.json` is correct
   - Verify package name matches Firebase config
   - Check FCM server key is uploaded to EAS

2. **Notifications not showing**
   - Check Android notification channels
   - Verify notification permissions
   - Test with production build

### Debug Commands

```bash
# Check EAS credentials
eas credentials:list

# View notification logs
npx expo start --dev-client

# Check build logs
eas build:list
```

## 📱 Device-Specific Settings

### iOS Settings

Users should ensure:
- Settings → Notifications → Sleep Detector → Allow Notifications (ON)
- Do Not Disturb settings don't block the app
- Critical Alerts (if implemented) are enabled

### Android Settings

Users should ensure:
- Settings → Apps → Sleep Detector → Notifications (Enabled)
- Battery optimization is disabled for the app
- Notification channels are properly configured

## ✅ Verification Checklist

Before releasing with notifications:

- [ ] iOS APNs key uploaded to EAS
- [ ] Android FCM server key configured
- [ ] Test notifications work on physical devices
- [ ] Notification permissions are properly requested
- [ ] Background delivery works correctly
- [ ] Notification content is clear and useful
- [ ] Settings allow users to customize notifications
- [ ] Privacy policy mentions notification usage

## 🎉 Success!

Once configured correctly, users will receive:
- 😴 Sleep detection alerts when inactivity threshold is reached
- ☀️ Wake summaries with sleep duration and quality
- 🌙 Optional bedtime reminders for consistent sleep schedules

For more help, check the [Expo Notifications documentation](https://docs.expo.dev/versions/latest/sdk/notifications/).
