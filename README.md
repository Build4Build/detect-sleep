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

## Privacy

Your sleep data is stored locally on your device. The app does not send your data to any servers unless you explicitly use the export feature to share it.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React Native and Expo
- Uses AsyncStorage for data persistence
- Charts powered by react-native-chart-kit 