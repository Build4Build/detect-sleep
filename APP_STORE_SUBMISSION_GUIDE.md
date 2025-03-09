# App Store Submission Guide for Sleep Detector

This guide walks through the process of submitting Sleep Detector to the Apple App Store.

## Prerequisites

- Apple Developer Program enrollment (Team ID: 2V8LZ2444Y)
- MacOS computer
- Expo CLI and EAS CLI installed
- Xcode installed (latest version recommended)

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

## Step 3: Configure the App

Ensure your app.json and eas.json files are properly configured (they should already be set up in this repository).

## Step 4: Create an App on App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Click "My Apps"
3. Click the "+" button and select "New App"
4. Fill in the required information:
   - Platform: iOS
   - Name: Sleep Detector
   - Primary language: English
   - Bundle ID: com.yourcompany.sleepdetector (match with app.json)
   - SKU: sleepdetector
   - User Access: Full Access

5. Click "Create"

## Step 5: App Store Information Setup

In App Store Connect, complete the following sections:

1. **App Information**
   - Privacy Policy URL (host your privacy policy online)
   - Category: Health & Fitness, Utilities
  
2. **Pricing and Availability**
   - Set price (free or paid)
   - Select availability countries

3. **iOS App**
   - 1.0 Prepare for Submission
   - Add required screenshots (see below for specifications)
   - Fill in promotional text (up to 170 characters)
   - Write a compelling description
   - Add keywords for search optimization
   - Provide support URL
   - Marketing URL (optional)
   
## Step 6: Screenshot Specifications

Prepare the following screenshots:
- iPhone 6.5" Display (1242 × 2688 pixels): 3 screenshots
- iPhone 5.5" Display (1242 × 2208 pixels): 3 screenshots
- iPad Pro 12.9" Display (2048 × 2732 pixels): 3 screenshots (if supporting iPad)

## Step 7: Build the App for App Store

```bash
cd detect-sleep
eas build --platform ios --profile production
```

Wait for the build to complete (this may take 10-20 minutes).

## Step 8: Submit the Build to App Store

Once the build is complete, you can submit directly through EAS:

```bash
eas submit --platform ios
```

Or download the build and upload through Xcode:

1. Download the .ipa file from EAS
2. Open Xcode
3. Go to Xcode > Open Developer Tool > Application Loader
4. Sign in with your Apple ID
5. Choose the .ipa file and upload

## Step 9: Complete Submission in App Store Connect

1. Return to App Store Connect > Your App > iOS App
2. Select your version (1.0)
3. Under "Build", select the build you just uploaded
4. Complete any missing information
5. Check "Export Compliance" and other required information
6. Click "Save" and then "Submit for Review"

## Step 10: Monitor Review Status

After submission, your app will be in the "Waiting for Review" state. Apple review usually takes 1-3 days. You can check the status in App Store Connect.

## Handling Rejections

If your app is rejected:
1. Read the rejection reason carefully
2. Make the necessary changes to your app
3. Build a new version with EAS
4. Submit the updated build
5. Respond to the rejection explaining the changes made

## Additional Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) 