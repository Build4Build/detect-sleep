# Sleep Detector release checks

Record the source commit, version/build, OS versions, devices, and outcomes. These are checks to perform, not claims that a release has passed them.

## Automated checks

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint -- --quiet
npx expo-doctor
npx expo export --platform ios
```

Review dependency advisories with `npm audit --omit=dev`. Establish which paths are exposed and which fixes are compatible; do not automatically accept major upgrades or downgrades.

## Lifecycle and sleep review

- [ ] Fresh install opens without requiring Health access or an account.
- [ ] Set the inactivity threshold to 5 minutes. Background the app for less than 5 minutes, then reopen; no estimate should appear.
- [ ] Background it for more than 5 minutes, then reopen; inspect any estimate and its original app-away interval. Longer intervals can be filtered by the sleep-evidence rules.
- [ ] Confirm a reviewed estimate; one completed period should appear in history with the expected times.
- [ ] Edit an estimate before confirming; the saved period should use the edited times.
- [ ] Dismiss an estimate; it should not become a saved sleep period.
- [ ] Repeat after force-quitting an already-backgrounded app and after a device restart.
- [ ] Test overnight sleep, a nap, rapid background/foreground transitions, and a time-zone change. Confirm elapsed durations and wake-up dates.
- [ ] Start and stop a manual sleep session and verify its completed duration.

App-away timing cannot establish device-wide inactivity or sleep. No periodic background log is expected while iOS suspends the app. Run the timing checks from the installed app rather than expecting Expo Go or a terminal log to prove them.

## Apple Health and Watch (physical devices)

- [ ] Enable Health integration and inspect the permission explanations. Test denial and partial grants as well as full authorization.
- [ ] Unconfirmed or dismissed estimates must not write Health sleep samples.
- [ ] Confirm with sync enabled; inspect the resulting sample in Health. Reopening or retrying should not duplicate the same record.
- [ ] Disable sync, confirm another period, and verify no new Health write occurs.
- [ ] Revoke permissions in Health/Settings; the app should remain usable and explain sync failures.
- [ ] Compare imported sleep stages with Health, including overlapping sources and awake gaps.
- [ ] Test the Watch with no samples, with sleep samples, and with optional recovery metrics missing.
- [ ] Refresh on Watch, reopen iPhone, and verify the expected evidence is available. Check a temporarily disconnected Watch too.

## UX, privacy, and release

- [ ] Review Today, history, details, statistics, settings, and export in light and dark appearance.
- [ ] Check small screens, larger text, and VoiceOver; declare only accessibility features that have been verified.
- [ ] Test local reminders with notification permission granted and denied.
- [ ] Clear app data and check the visible history. Previously synced Health data is managed separately in Apple Health.
- [ ] Export JSON and CSV; verify times, contents, and the selected sharing destination.
- [ ] Measure an overnight physical-device session for battery use; a simulator build or unit test does not establish energy consumption.
- [ ] Produce a native Release build and validate distribution signing, entitlements, the Watch companion, and version/build numbers.
- [ ] Verify privacy/support links, age rating, metadata, current screenshots, and reviewer instructions in App Store Connect.
- [ ] Confirm the selected uploaded build matches the reviewed source before submitting. Verify the resulting review or public-release status directly.
