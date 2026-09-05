#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$ROOT/backgrounds/midnight-aurora-source.png"
OVERLAYS="$ROOT/overlays"
FINAL="$ROOT/final"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/sleep-watch-assets.XXXXXX")"

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

  rsvg-convert -w 1688 -h 2056 -o "$rendered_overlay" "$OVERLAYS/$overlay"

  magick \
    \( "$SOURCE" -resize '1688x2056^' -gravity "$gravity" -extent 1688x2056 -modulate "$brightness,$saturation,$hue" \) \
    "$rendered_overlay" \
    -compose over -composite \
    -resize '422x514!' \
    -alpha off -colorspace sRGB -type TrueColor -strip \
    "$FINAL/$output"
}

render 01-night-glance.svg 01-your-night-at-a-glance.png north 84 108 100
render 02-sleep-stages.svg 02-every-sleep-stage.png center 78 118 108
render 03-recovery-context.svg 03-recovery-in-context.png south 72 108 92
render 04-health-choice.svg 04-health-access-is-your-choice.png center 76 125 114
render 05-battery-conscious.svg 05-smarter-data-lighter-battery.png north 72 112 88

magick "$FINAL"/*.png +append "$ROOT/watch-screenshot-contact-sheet.png"

echo "Generated Apple Watch screenshots in $FINAL"
