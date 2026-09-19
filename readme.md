# Sleep Detector 😴

Sleep Detector is a private sleep journal for iPhone with an Apple Watch companion, published by **SimpliXio Pte. Ltd.**

[Download on the App Store](https://apps.apple.com/app/id6743064638) · [GitHub releases](https://github.com/Build4Build/detect-sleep/releases)

## How it works

1. The app saves a timestamp when it goes into the background.
2. When you reopen it after the configured threshold (30 minutes by default), it evaluates the elapsed interval.
3. Optional Apple Health records and Apple Watch sleep evidence can refine the estimate.
4. Review the proposed times, adjust them if needed, then confirm or dismiss the estimate. Confirmed periods can sync to Apple Health when you enable sync and grant permission.

Time away from this app does not prove that the phone was unused or that you were asleep. iOS may suspend background apps, so the estimate is completed when Sleep Detector reopens. There is no continuous sensor or workout session.

Sleep Detector supports personal awareness and journaling. It does not diagnose sleep disorders.

## Features

- Editable sleep estimates with confidence and evidence details.
- Sleep history, duration trends, and daily wellness context.
- Optional Apple Health access and confirmed-sleep syncing with duplicate protection.
- Apple Watch duration, stages, and available recovery signals.
- Local reminders, system appearance support, and JSON/CSV export.
- No account, advertising, tracking, or developer-operated cloud sleep profile.

HealthKit and the Watch companion are iOS features. Android project generation is available, but Google Fit integration is not implemented; the iOS release checks do not establish Android production readiness.

## Development

The project uses Expo SDK 55 and React Native 0.83. The installed React Native/Metro packages require **Node.js 20.19.4 or newer**. iOS development also requires macOS, Xcode with the required platform SDKs, and CocoaPods.

```sh
git clone https://github.com/Build4Build/detect-sleep.git
cd detect-sleep
# Use the published source when reproducing the App Store 1.4.1 release.
git switch --detach v1.4.1
npm ci
npm run ios
```

For ongoing development, check out the branch you intend to modify instead of a release tag. `npm run ios` generates the native project if absent, builds the app, and starts Metro. After the native app is installed, `npm start` restarts Metro for JavaScript development.

This app needs its own native build: HealthKit, Watch connectivity, and the local Swift module are not included in Expo Go. See Expo's [native development-build guidance](https://docs.expo.dev/develop/development-builds/introduction/).

Signing and EAS project identifiers are defined in [app.json](app.json) and [eas.json](eas.json). The current static app configuration does not read `APPLE_TEAM_ID` from `.env`; setting that variable alone will not change the signing team. Forks must configure their own identifiers and capabilities.

See [local build and signing guidance](LOCAL_BUILD_GUIDE.md).

## Verification

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint -- --quiet
npx expo-doctor
npx expo export --platform ios
```

The export command checks the production JavaScript bundle; it does not produce a signed App Store archive. Expo Doctor and the dependency audit can flag newer patches after a release. Review their output before producing the next build.

Use the [manual testing checklist](TESTING_CHECKLIST.md) for lifecycle, Health permissions, Watch, and physical-device checks. Diagnostics are available through `bash monitor-sleep-detection.sh --help`.

## Production release

Use the existing EAS production profile with an account authorized for this project:

```sh
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

Select the intended build during submission. EAS Submit uploads to App Store Connect; the release still needs the correct build, metadata, privacy declarations, assets, and App Review submission in App Store Connect. EAS manages the remote build number and increments it for production builds. Update the app version in both `app.json` and `package.json` for a new store version.

Keep the signed build associated with its source commit. Publish a GitHub tag only for the reviewed source; do not move a published release tag to later changes.

Current store materials:

- [iPhone screenshots](app-store-assets/iphone/README.md)
- [Apple Watch screenshots](app-store-assets/watch/README.md)
- [Store description](app-store-assets/metadata/en-US/description.txt)
- [Reviewer instructions](app-store-assets/metadata/en-US/review_notes.txt)
- [1.4.3 release notes](app-store-assets/release-notes/1.4.3.md)
- [1.4.2 release notes](app-store-assets/release-notes/1.4.2.md)
- [1.4.1 release notes](app-store-assets/release-notes/1.4.1.md)

## Founder, Creator, and Engineer

**[Pierre-Henry Soria](https://pierrehenry.dev)** conceived Sleep Detector, created the product vision, brought the clarity needed to turn the idea into a useful experience, and designed and built the systems behind the app. He started working on those systems in early **2024** to solve the painful gap between phone inactivity and useful, reviewable sleep insight.

Pierre-Henry continues to lead the product vision, engineering, privacy model, sleep-analysis architecture, Apple Health integration, and Apple Watch experience.

- Website: [pierrehenry.dev](https://pierrehenry.dev)
- GitHub: [github.com/pH-7](https://github.com/pH-7)
- LinkedIn: [linkedin.com/in/ph7enry](https://www.linkedin.com/in/ph7enry/)

Enjoying this project? **[Buy me a coffee](https://ko-fi.com/phenry)** (spoiler: I love almond extra-hot flat white coffees).

[![Pierre-Henry Soria](https://s.gravatar.com/avatar/a210fe61253c43c869d71eaed0e90149?s=200)](https://pierrehenry.dev "Pierre-Henry Soria’s personal website")

[![@phenrysay][x-icon]](https://x.com/phenrysay "Follow Me on X") [![YouTube Tech Videos][youtube-icon]](https://www.youtube.com/@pH7Programming "My YouTube Tech Channel") [![pH-7][github-icon]](https://github.com/pH-7 "Follow Me on GitHub") [![BlueSky][bsky-icon]](https://bsky.app/profile/pierrehenry.dev "Follow Me on BlueSky")


## Privacy First!

Sleep records and analysis stay on your devices. Apple Health access and confirmed-sleep sync are optional; exports are shared only when you choose a destination. See the [privacy policy](PRIVACY.md) for details.

## License

**Sleep Detector** is generously distributed under the [MIT License](license.md).


<!-- GitHub's Markdown reference links -->
[x-icon]: https://img.shields.io/badge/x-000000?style=for-the-badge&logo=x
[bsky-icon]: https://img.shields.io/badge/BlueSky-00A8E8?style=for-the-badge&logo=bluesky&logoColor=white
[github-icon]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[youtube-icon]: https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white
