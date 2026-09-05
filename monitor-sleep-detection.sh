#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: bash monitor-sleep-detection.sh [ios-simulator|ios-device|android [serial]]' \
    '' \
    'Streams diagnostics; it does not measure sleep or change app settings.' \
    'Use TESTING_CHECKLIST.md to verify app-away estimates when the app reopens.' \
    'No periodic background messages are expected while iOS suspends the app.'
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

mode="${1:---help}"
case "$mode" in
  --help|-h)
    usage
    ;;
  ios-simulator)
    if [ "$#" -ne 1 ]; then usage >&2; exit 2; fi
    require_command xcrun
    printf '%s\n' \
      'Streaming SleepDetector process logs from the booted iOS simulator.' \
      'Use the Metro terminal for JavaScript diagnostics in development builds.' \
      'Open the app, background it, then reopen after your configured threshold.'
    exec xcrun simctl spawn booted log stream \
      --predicate 'process == "SleepDetector" OR subsystem BEGINSWITH "com.sleepdetector"' \
      --level debug
    ;;
  ios-device)
    if [ "$#" -ne 1 ]; then usage >&2; exit 2; fi
    printf '%s\n' \
      'Connect and unlock the iPhone.' \
      'In Xcode, open Window > Devices and Simulators and select the device.' \
      'Use Open Console and filter for the SleepDetector process.' \
      'For a development build, also inspect the Metro terminal.' \
      'Follow TESTING_CHECKLIST.md; logs alone do not establish sleep accuracy.'
    ;;
  android)
    if [ "$#" -gt 2 ]; then usage >&2; exit 2; fi
    require_command adb
    printf '%s\n' \
      'Streaming React Native JavaScript logs. Use Ctrl-C to stop.' \
      'If multiple devices are connected, pass the serial shown by adb devices.'
    if [ "$#" -eq 2 ]; then
      exec adb -s "$2" logcat 'ReactNativeJS:V' 'ReactNative:V' '*:S'
    fi
    exec adb logcat 'ReactNativeJS:V' 'ReactNative:V' '*:S'
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
