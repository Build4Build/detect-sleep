#!/bin/bash

# Sleep Detector Build & Deploy Script

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Sleep Detector Build & Deploy Script =====${NC}"
echo -e "${YELLOW}Streamlined build and submission process${NC}"

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

# Function to build for a specific platform
build_app() {
    PLATFORM=$1
    echo -e "${BLUE}Building for $PLATFORM...${NC}"
    
    eas build --platform $PLATFORM --profile production
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Build for $PLATFORM failed!${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Build for $PLATFORM completed successfully!${NC}"
    return 0
}

# Function to submit a built app
submit_app() {
    PLATFORM=$1
    echo -e "${BLUE}Submitting for $PLATFORM...${NC}"
    
    # Check for Android service account key if needed
    if [ "$PLATFORM" = "android" ] && [ ! -f "./pc-api-key.json" ]; then
        echo -e "${RED}Warning: Android service account key (pc-api-key.json) is missing!${NC}"
        echo -e "${YELLOW}This is required for Android submission.${NC}"
        read -p "Continue anyway? (y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ]; then
            return 1
        fi
    fi
    
    eas submit --platform $PLATFORM --latest
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Submission for $PLATFORM failed!${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Submission for $PLATFORM completed successfully!${NC}"
    return 0
}

# Main function
main() {
    echo -e "${BLUE}Choose an option:${NC}"
    echo "1) Build and submit for iOS"
    echo "2) Build and submit for Android"
    echo "3) Build and submit for both platforms"
    echo "4) Exit"
    
    read -p "Enter your choice (1-4): " CHOICE
    
    case $CHOICE in
        1)
            update_versions
            build_app "ios" && submit_app "ios"
            ;;
        2)
            update_versions
            build_app "android" && submit_app "android"
            ;;
        3)
            update_versions
            build_app "ios" && submit_app "ios"
            build_app "android" && submit_app "android"
            ;;
        4)
            echo -e "${GREEN}Exiting.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice!${NC}"
            exit 1
            ;;
    esac
}

# Run the main function
main

