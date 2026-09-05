#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -gt 1 ] || { [ "$#" -eq 1 ] && [ "$1" != '--help' ] && [ "$1" != '-h' ]; }; then
  printf '%s\n' 'Usage: bash ios-signing-help.sh [--help]' >&2
  exit 2
fi

printf '%s\n' \
  'Sleep Detector iOS signing guidance' \
  '' \
  'This helper only prints instructions. It does not reset or revoke credentials.' \
  '' \
  '1. Check ios.appleTeamId and bundleIdentifier in app.json.' \
  '2. Check the production credentialsSource in eas.json (currently remote).' \
  '3. To inspect EAS signing interactively, run:' \
  '   npx eas-cli credentials --platform ios' \
  '   Select the production profile; review the existing credentials first.' \
  '   The EAS menu can modify credentials if you choose a modifying action.' \
  '4. Ensure both iPhone and Watch targets have the required HealthKit and app-group capabilities.' \
  '5. If macOS shows a Keychain prompt, inspect the named keychain in Keychain Access.' \
  '   Its password can differ from the current login password after a password change.' \
  '   Revoking Apple distribution certificates does not repair a local keychain password.' \
  '' \
  'Once signing is verified, the production build command is:' \
  '   npx eas-cli build --platform ios --profile production' \
  '' \
  'Never share private keys, certificate passwords, or credentials.json in Git or logs.' \
  'See LOCAL_BUILD_GUIDE.md for native build and signing details.'
