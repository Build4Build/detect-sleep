#!/bin/bash

echo "Building iOS app with Node.js fix..."

# Ensure we have Node.js in the expected location
if [ ! -f "/opt/homebrew/Cellar/node/23.9.0/bin/node" ]; then
    echo "Creating Node.js wrapper..."
    
    # Create the directory
    mkdir -p /opt/homebrew/Cellar/node/23.9.0/bin
    
    # Create a wrapper script that uses any available node
    cat > /opt/homebrew/Cellar/node/23.9.0/bin/node << 'EOF'
#!/bin/bash
# Node.js wrapper script

# Try different possible Node.js locations
if command -v /usr/local/bin/node >/dev/null 2>&1; then
    exec /usr/local/bin/node "$@"
elif command -v /opt/homebrew/bin/node >/dev/null 2>&1; then
    exec /opt/homebrew/bin/node "$@"
elif command -v node >/dev/null 2>&1; then
    exec node "$@"
else
    echo "Error: Node.js not found in any expected location"
    echo "Please install Node.js and try again"
    exit 1
fi
EOF
    
    chmod +x /opt/homebrew/Cellar/node/23.9.0/bin/node
    echo "Node.js wrapper created"
fi

# Clean and rebuild
echo "Cleaning iOS project..."
cd /Users/pierre-henrysoria/Code/detect-sleep/ios
rm -rf Pods/ Podfile.lock
pod install

echo "Building archive..."
xcodebuild clean -workspace SleepDetector.xcworkspace -scheme SleepDetector
xcodebuild archive -workspace SleepDetector.xcworkspace -scheme SleepDetector -destination "generic/platform=iOS" -archivePath ../build/SleepDetector.xcarchive
