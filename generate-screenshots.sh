#!/bin/bash

# Sleep Detector - Screenshot Generator Script
# This script will help you create professional screenshots for App Store submission

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Sleep Detector Screenshot Generator =====${NC}"
echo -e "${YELLOW}This script will help create professional screenshots for App Store submission${NC}"

# Check for required tools
if ! command -v convert &> /dev/null; then
    echo -e "${RED}ImageMagick not found!${NC}"
    echo -e "${YELLOW}Please install ImageMagick first:${NC}"
    echo "  - macOS: brew install imagemagick"
    echo "  - Linux: sudo apt-get install imagemagick"
    exit 1
fi

# Create screenshots directory if it doesn't exist
mkdir -p assets/screenshots

# Image dimensions for iPhone 6.5" screenshots (iPhone 11 Pro Max, 12 Pro Max, etc.)
WIDTH=1242
HEIGHT=2688

# Function to create a screenshot with text
create_screenshot() {
    local title="$1"
    local subtitle="$2"
    local filename="$3"
    local accent_color="$4"
    local icon="$5"
    
    echo -e "${GREEN}Creating: ${filename}${NC}"
    
    # Create base image with gradient background
    convert -size ${WIDTH}x${HEIGHT} gradient:#f5f5f5-#e0e0e0 \
        -fill "${accent_color}" -draw "rectangle 0,0 ${WIDTH},200" \
        assets/screenshots/${filename}
    
    # Add title text
    convert assets/screenshots/${filename} \
        -pointsize 80 -font Arial -fill white -gravity north \
        -annotate +0+80 "${title}" \
        assets/screenshots/${filename}
    
    # Add subtitle text
    convert assets/screenshots/${filename} \
        -pointsize 40 -font Arial -fill white -gravity north \
        -annotate +0+160 "${subtitle}" \
        assets/screenshots/${filename}
    
    # Add app mockup placeholder (this would be replaced with actual screenshots)
    convert assets/screenshots/${filename} \
        -fill white -draw "roundrectangle 96,400 $(($WIDTH-96)),$(($HEIGHT-400)) 40,40" \
        assets/screenshots/${filename}
    
    # Add icon placeholder
    convert assets/screenshots/${filename} \
        -fill "${accent_color}" -draw "circle $(($WIDTH/2)),$(($HEIGHT/2-300)) $(($WIDTH/2-100)),$(($HEIGHT/2-300))" \
        -pointsize 120 -font Arial -fill white -gravity center \
        -annotate +0-300 "${icon}" \
        assets/screenshots/${filename}
    
    # Add device frame (placeholder - in real usage you would overlay an actual device frame)
    convert assets/screenshots/${filename} \
        -fill none -stroke black -strokewidth 4 \
        -draw "roundrectangle 50,300 $(($WIDTH-50)),$(($HEIGHT-50)) 40,40" \
        assets/screenshots/${filename}
    
    echo -e "${GREEN}Created: assets/screenshots/${filename}${NC}"
}

# Create a set of sample screenshots
create_screenshot "Sleep Tracking" "Automatically track your sleep patterns" "screen1.png" "#6200ee" "Zz"
create_screenshot "Detailed Analytics" "Understand your sleep quality" "screen2.png" "#03A9F4" "📊"
create_screenshot "Sleep History" "View your sleep trends over time" "screen3.png" "#4CAF50" "📅"
create_screenshot "Export Data" "Share or analyze your sleep data" "screen4.png" "#FF9800" "📤"
create_screenshot "Customizable Settings" "Adjust to your sleep habits" "screen5.png" "#9C27B0" "⚙️"

echo -e "${BLUE}==== Screenshot Generation Complete ====${NC}"
echo -e "${YELLOW}Screenshots saved to: assets/screenshots/${NC}"
echo -e "${YELLOW}For real App Store screenshots, replace the placeholders with actual app screenshots.${NC}"
echo -e "${GREEN}Remember to add device frames using Apple's Marketing Resources: https://developer.apple.com/app-store/marketing/guidelines/#section-products${NC}"

# Make the script executable
chmod +x generate-screenshots.sh 