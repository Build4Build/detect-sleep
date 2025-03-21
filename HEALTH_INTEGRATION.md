# Health Integration Implementation

## Overview

The Sleep Detector app now integrates with both Apple Health (iOS) and Google Fit (Android) to provide a more comprehensive sleep tracking experience. This integration allows the app to:

1. Import sleep data from health platforms
2. Export detected sleep to health platforms
3. Provide a unified experience across platforms

## Implementation Details

### Architecture

The integration follows a clean architecture with platform-specific services wrapped by a unified interface:

- `HealthService`: Platform-agnostic service that delegates to the appropriate platform-specific implementation
- `AppleHealthService`: iOS-specific implementation using Apple HealthKit
- `GoogleFitService`: Android-specific implementation using Google Fit

### Key Files

- `src/services/HealthService.ts`: The main entry point for health integration
- `src/services/AppleHealthService.ts`: Apple HealthKit implementation
- `src/services/GoogleFitService.ts`: Google Fit implementation
- `src/types/SleepEntry.ts`: Shared data model for sleep entries
- `src/components/HealthIntegrationSettings.tsx`: UI component for managing health integrations
- `src/services/SleepTrackerService.ts`: Updated to support syncing with health services

### Configuration

The app.json has been updated with the necessary permissions and configurations:

#### iOS Configuration
```json
"ios": {
  "infoPlist": {
    "NSHealthShareUsageDescription": "We use Health data to improve sleep detection accuracy and to compare with our detection algorithm",
    "NSHealthUpdateUsageDescription": "We can write your detected sleep data to Apple Health to consolidate your health information"
  }
}
```

#### Android Configuration
```json
"android": {
  "permissions": [
    "ACTIVITY_RECOGNITION",
    "android.permission.ACTIVITY_RECOGNITION",
    "com.google.android.gms.permission.ACTIVITY_RECOGNITION"
  ]
},
"plugins": [
  [
    "expo-health-connect", 
    {
      "healthConnectPermissions": [
        "READ_SLEEP",
        "WRITE_SLEEP"
      ]
    }
  ]
]
```

## User Experience

The user can manage health integration through a dedicated section in the Settings screen:

1. Connect/disconnect from health services
2. Enable/disable automatic import of sleep data
3. Enable/disable automatic export of detected sleep
4. View integration status

## Technical Notes

### Apple Health
- Uses the `react-native-health` package
- Requires specific permissions in Info.plist
- Handles sleep data through HealthKit's sleep analysis category

### Google Fit
- Uses the `expo-health-connect` package
- Implementation is prepared but some functionality is commented as it requires further testing
- Requires specific Android permissions

## Limitations

1. Google Fit implementation is prepared but may require additional configuration based on specific device implementations
2. Some health platform API limitations may affect data synchronization
3. Sleep stage information may not be fully compatible between platforms

## Future Improvements

1. Add detailed sleep stage tracking (deep sleep, REM, etc.)
2. Implement bidirectional real-time syncing
3. Add heart rate correlation with sleep data
4. Support additional health metrics for more comprehensive analysis 