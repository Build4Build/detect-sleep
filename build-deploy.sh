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
echo "5. Exit"
read -p "Enter your choice (1-5): " choice

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
        eas build --platform ios --profile production
        ;;
    4)
        echo -e "${BLUE}Submitting to App Store...${NC}"
        echo -e "${YELLOW}Make sure you've already created your app on App Store Connect${NC}"
        read -p "Enter your Apple ID email: " apple_id
        read -p "Enter your App Store Connect App ID: " asc_app_id
        
        # Update eas.json with the provided information
        tmp=$(mktemp)
        jq --arg email "$apple_id" --arg appid "$asc_app_id" '.submit.production.ios.appleId = $email | .submit.production.ios.ascAppId = $appid' eas.json > "$tmp" && mv "$tmp" eas.json
        
        echo -e "${BLUE}Running submission...${NC}"
        eas submit -p ios --latest
        ;;
    5)
        echo -e "${GREEN}Exiting script.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Process completed!${NC}" 