#!/bin/bash

# Sleep Detector Build & Deploy Script

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Sleep Detector Build & Deploy Script =====${NC}"
echo -e "${YELLOW}This script will help you build and deploy your app to the App Store${NC}"

# Check for EAS CLI
if ! command -v eas &> /dev/null; then
    echo -e "${RED}EAS CLI not found!${NC}"
    echo "Installing EAS CLI..."
    npm install -g eas-cli
fi

# Make sure user is logged in
echo -e "${BLUE}Checking Expo login status...${NC}"
eas whoami || { 
    echo -e "${YELLOW}Please login to Expo:${NC}"
    eas login
}

# Menu
echo -e "\n${GREEN}What would you like to do?${NC}"
echo "1. Build development version (for testing)"
echo "2. Build preview version (internal distribution)"
echo "3. Build production version (App Store)"
echo "4. Submit to App Store"
echo "5. Generate app icons (requires ImageMagick)"
echo "6. Fix widget issues"
echo "7. Exit"
read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo -e "${BLUE}Building development version...${NC}"
        eas build --platform ios --profile development
        ;;
    2)
        echo -e "${BLUE}Building preview version...${NC}"
        eas build --platform ios --profile preview
        ;;
    3)
        echo -e "${BLUE}Building production version for App Store...${NC}"
        read -p "Have you updated app.json with the correct version number? (y/n): " version_updated
        if [[ $version_updated != "y" ]]; then
            echo -e "${RED}Please update version number in app.json before building${NC}"
            exit 1
        fi
        
        # Check for required assets
        if [ ! -f "./assets/icon.png" ] || [ ! -f "./assets/splash.png" ]; then
            echo -e "${RED}Missing required assets!${NC}"
            echo -e "${YELLOW}Make sure you have icon.png and splash.png in the assets folder${NC}"
            read -p "Continue anyway? (y/n): " continue_anyway
            if [[ $continue_anyway != "y" ]]; then
                exit 1
            fi
        fi
        
        eas build --platform ios --profile production
        ;;
    4)
        echo -e "${BLUE}Submitting to App Store...${NC}"
        echo -e "${YELLOW}Make sure you've already created your app on App Store Connect${NC}"
        read -p "Enter your Apple ID email: " apple_id
        read -p "Enter your App Store Connect App ID: " asc_app_id
        
        # Update eas.json with the provided information
        if command -v jq &> /dev/null; then
            tmp=$(mktemp)
            jq --arg email "$apple_id" --arg appid "$asc_app_id" '.submit.production.ios.appleId = $email | .submit.production.ios.ascAppId = $appid' eas.json > "$tmp" && mv "$tmp" eas.json
            echo -e "${GREEN}eas.json updated with your credentials${NC}"
        else
            echo -e "${YELLOW}jq not found. Please manually update eas.json with your credentials${NC}"
            read -p "Press enter when ready..."
        fi
        
        echo -e "${BLUE}Running submission...${NC}"
        eas submit -p ios --latest
        ;;
    5)
        echo -e "${BLUE}Generating app icons...${NC}"
        
        # Check for ImageMagick
        if ! command -v convert &> /dev/null; then
            echo -e "${RED}ImageMagick not found!${NC}"
            echo -e "${YELLOW}Please install ImageMagick first:${NC}"
            echo "  - macOS: brew install imagemagick"
            echo "  - Linux: sudo apt-get install imagemagick"
            exit 1
        fi
        
        # Create assets directory if it doesn't exist
        mkdir -p assets
        
        # Generate a simple purple icon with "Zz" text
        echo -e "${YELLOW}Creating icon.png...${NC}"
        convert -size 1024x1024 xc:#6200ee \
            -fill white -draw "circle 512,512 512,350" \
            -pointsize 300 -font Arial -fill "#6200ee" -gravity center -draw "text 0,0 'Zz'" \
            assets/icon.png
        
        # Create adaptive icon for Android
        echo -e "${YELLOW}Creating adaptive-icon.png...${NC}"
        cp assets/icon.png assets/adaptive-icon.png
        
        # Create splash screen
        echo -e "${YELLOW}Creating splash.png...${NC}"
        convert -size 1242x2436 xc:white \
            -fill "#6200ee" -pointsize 100 -font Arial -gravity center -draw "text 0,-200 'Sleep Detector'" \
            -pointsize 60 -fill "#999999" -gravity center -draw "text 0,0 'Track your sleep patterns'" \
            -fill "#6200ee" -draw "circle 621,1500 621,1300" \
            -pointsize 150 -font Arial -fill white -gravity center -draw "text 0,400 'Zz'" \
            assets/splash.png
            
        # Create favicon
        echo -e "${YELLOW}Creating favicon.png...${NC}"
        convert assets/icon.png -resize 192x192 assets/favicon.png
        
        echo -e "${GREEN}App icons generated successfully!${NC}"
        ;;
    6)
        echo -e "${BLUE}Fixing widget issues...${NC}"
        
        # Check if the widgets directory exists
        if [ ! -d "./src/widgets" ]; then
            echo -e "${YELLOW}Creating widgets directory...${NC}"
            mkdir -p ./src/widgets
        fi
        
        # Make sure the Widget is properly registered in App.tsx
        if ! grep -q "registerWidget" App.tsx; then
            echo -e "${YELLOW}Widget registration not found in App.tsx!${NC}"
            echo -e "${YELLOW}Please make sure to import and register the widget in App.tsx${NC}"
        fi
        
        # Check expo-widgets is installed
        if ! grep -q "expo-widgets" package.json; then
            echo -e "${YELLOW}expo-widgets not found in package.json. Installing...${NC}"
            npm install expo-widgets
        fi
        
        # Check widget configuration in app.json
        if ! grep -q "widgets" app.json; then
            echo -e "${RED}Widget configuration not found in app.json!${NC}"
            echo -e "${YELLOW}Please make sure to add the widget configuration to app.json${NC}"
        fi
        
        echo -e "${GREEN}Widget verification completed!${NC}"
        ;;
    7)
        echo -e "${GREEN}Exiting script.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Process completed!${NC}"
echo -e "${YELLOW}Remember to check the App Store Connect console for submission status${NC}" 