#!/bin/zsh

echo "🚀 Starting iOS Build Process with Node.js Fix"
echo "============================================="

# Set proper PATH
export PATH="/opt/homebrew/bin:/opt/homebrew/Cellar/node/23.9.0/bin:/usr/local/bin:$PATH"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify Node.js installation
echo "📝 Checking Node.js installation..."
if [[ -f "/opt/homebrew/Cellar/node/23.9.0/bin/node" ]]; then
    echo "✅ Node.js found at expected path"
    /opt/homebrew/Cellar/node/23.9.0/bin/node --version
else
    echo "❌ Node.js not found, installing..."
    
    # Download and install Node.js
    curl -fsSL https://nodejs.org/dist/v20.11.1/node-v20.11.1-darwin-arm64.tar.gz | tar -xz -C /tmp
    
    # Create directory and copy files
    sudo mkdir -p /opt/homebrew/Cellar/node/23.9.0/bin
    sudo cp /tmp/node-v20.11.1-darwin-arm64/bin/* /opt/homebrew/Cellar/node/23.9.0/bin/
    sudo chmod +x /opt/homebrew/Cellar/node/23.9.0/bin/*
    
    # Create symlinks
    sudo mkdir -p /opt/homebrew/bin
    sudo ln -sf /opt/homebrew/Cellar/node/23.9.0/bin/node /opt/homebrew/bin/node
    sudo ln -sf /opt/homebrew/Cellar/node/23.9.0/bin/npm /opt/homebrew/bin/npm
    
    echo "✅ Node.js installed successfully"
fi

# Navigate to project directory
cd /Users/pierre-henrysoria/Code/detect-sleep

echo "🧹 Cleaning previous builds..."
rm -rf ios/Pods ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/SleepDetector-*
rm -rf build/*.xcarchive

echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install

echo "🔨 Building iOS Archive..."
cd /Users/pierre-henrysoria/Code/detect-sleep/ios

# Clean first
xcodebuild clean -workspace SleepDetector.xcworkspace -scheme SleepDetector

# Create archive
echo "📱 Creating iOS Archive..."
xcodebuild archive \
    -workspace SleepDetector.xcworkspace \
    -scheme SleepDetector \
    -destination "generic/platform=iOS" \
    -archivePath ../build/SleepDetector.xcarchive \
    -configuration Release

if [[ $? -eq 0 ]]; then
    echo "✅ iOS Archive created successfully!"
    echo "📍 Archive location: /Users/pierre-henrysoria/Code/detect-sleep/build/SleepDetector.xcarchive"
    
    echo "🚀 Next steps:"
    echo "1. Open Xcode"
    echo "2. Go to Window > Organizer"
    echo "3. Select your archive and click 'Distribute App'"
    echo "4. Choose 'App Store Connect' for upload"
    
else
    echo "❌ iOS Archive creation failed"
    echo "Please check the error messages above"
    exit 1
fi

echo "🎉 Build process completed!"
