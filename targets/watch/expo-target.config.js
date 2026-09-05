/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "watch",
  name: "SleepDetectorWatch",
  displayName: "Sleep Detector",
  bundleIdentifier: ".watch",
  icon: "../../assets/icon.png",
  colors: { $accent: "#6C2BFF" },
  deploymentTarget: "9.4",
  frameworks: ["HealthKit", "WatchConnectivity", "SwiftUI"],
  entitlements: {
    "com.apple.developer.healthkit": true,
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
