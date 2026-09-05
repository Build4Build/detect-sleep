# Local iOS builds

Use Node.js 20.19.4 or newer, npm, CocoaPods, and Xcode with iOS/watchOS SDKs installed. The repository uses Expo SDK 55 and contains native HealthKit, WatchConnectivity, and Swift code, so Expo Go cannot run the complete app.

## Install and run

```sh
npm ci
npm run ios
```

For a connected iPhone:

```sh
npx expo run:ios --device
```

Select the intended device and use a signing team authorized for the configured identifiers. A simulator is useful for navigation and empty states; verify real Health data, permissions, Watch communication, and battery behavior on physical devices.

The generated `ios/` and `android/` directories are ignored. Persistent native changes belong in `app.json`, config plugins, `modules/sleep-intelligence/`, or `targets/watch/`. Preserve local native edits before running `npm run prebuild:ios`: that command uses `--clean` and regenerates the iOS project.

## Release compilation without distribution signing

After generating the native workspace, a simulator Release build can check the iPhone and embedded Watch target:

```sh
xcodebuild -workspace ios/SleepDetector.xcworkspace \
  -scheme SleepDetector -configuration Release \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/detect-sleep-release-check \
  CODE_SIGNING_ALLOWED=NO build
```

This is a compilation check, not an installable App Store archive. Follow the production EAS commands in the README to produce a distribution build. Check Apple's [current SDK requirements](https://developer.apple.com/news/upcoming-requirements/) before uploading.

## Signing and Keychain troubleshooting

- Check `ios.appleTeamId` and the bundle identifier in `app.json`. The `.env.example` variable does not override the current static configuration.
- Check `credentialsSource` in the production profile of `eas.json`. It currently uses credentials managed remotely by EAS.
- Run `bash ios-signing-help.sh` for diagnostic steps. The helper only prints guidance; it does not change credentials.
- A Keychain prompt asks for the password of the named keychain. This can differ from the current macOS login password, for example after a password change. Inspect the named keychain in Keychain Access; do not repeatedly revoke valid distribution certificates to solve a local unlock problem.
- Keep API keys, certificates, provisioning profiles, passwords, and `credentials.json` outside Git. Never paste their contents into public build logs or issues.

For environment failures, record the command, Xcode version, Node version, and the first useful error. Rebuild after native dependency or config-plugin changes; restarting Metro alone does not update native code.
