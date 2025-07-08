#!/bin/bash
set -e

echo "Installing Node.js for iOS build..."

# Download Node.js binary for macOS ARM64
NODE_VERSION="20.11.1"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz"
NODE_DIR="/tmp/node-v${NODE_VERSION}-darwin-arm64"

echo "Downloading Node.js ${NODE_VERSION}..."
curl -fsSL "$NODE_URL" | tar -xz -C /tmp

echo "Installing Node.js to system locations..."

# Install to /usr/local/bin (standard location)
if [ -f "$NODE_DIR/bin/node" ]; then
    sudo cp "$NODE_DIR/bin/node" /usr/local/bin/node
    sudo cp "$NODE_DIR/bin/npm" /usr/local/bin/npm
    sudo cp "$NODE_DIR/bin/npx" /usr/local/bin/npx
    sudo chmod +x /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx
    echo "Node.js installed to /usr/local/bin"
fi

# Install to the specific path expected by the iOS build
sudo mkdir -p /opt/homebrew/Cellar/node/23.9.0/bin
sudo cp "$NODE_DIR/bin/node" /opt/homebrew/Cellar/node/23.9.0/bin/node
sudo chmod +x /opt/homebrew/Cellar/node/23.9.0/bin/node

# Create symlinks
sudo mkdir -p /opt/homebrew/bin
sudo ln -sf /opt/homebrew/Cellar/node/23.9.0/bin/node /opt/homebrew/bin/node

echo "Node.js installation complete!"
echo "Version: $(/opt/homebrew/Cellar/node/23.9.0/bin/node --version)"

# Clean up
rm -rf "$NODE_DIR"

echo "Now you can run the iOS build successfully."
