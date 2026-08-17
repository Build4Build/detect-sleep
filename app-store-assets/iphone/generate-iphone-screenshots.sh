#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$ROOT/../watch/backgrounds/midnight-aurora-source.png"
OVERLAYS="$ROOT/overlays"
FINAL="$ROOT/final"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/sleep-iphone-assets.XXXXXX")"

trap 'rm -rf "$WORK"' EXIT

mkdir -p "$FINAL"

render() {
  local overlay="$1"
  local output="$2"
  local gravity="$3"
  local brightness="$4"
  local saturation="$5"
  local hue="$6"
  local rendered_overlay="$WORK/${overlay%.svg}.png"

  rsvg-convert -w 1320 -h 2868 -o "$rendered_overlay" "$OVERLAYS/$overlay"

  magick \
    \( "$SOURCE" -resize '1320x2868^' -gravity "$gravity" -extent 1320x2868 -modulate "$brightness,$saturation,$hue" \) \
    "$rendered_overlay" \
    -compose over -composite \
    -alpha off -colorspace sRGB -type TrueColor -strip \
    "$FINAL/$output"
}

render 01-night-summary.svg 01-wake-up-with-clarity.png north 73 112 100
render 02-review-estimate.svg 02-review-before-you-save.png center 69 120 106
render 03-health-control.svg 03-apple-health-your-choice.png south 67 116 112
render 04-private-trends.svg 04-see-patterns-not-guesses.png center 65 108 94
render 05-battery-privacy.svg 05-smarter-data-lighter-battery.png north 63 114 86

magick "$FINAL"/*.png -resize 264x574 +append "$ROOT/iphone-screenshot-contact-sheet.png"

echo "Generated iPhone screenshots in $FINAL"
