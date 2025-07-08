#!/bin/bash

echo "Installing Node.js for iOS build..."

# Set PATH to include Homebrew
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Try to install Node.js via Homebrew
if command -v brew >/dev/null 2>&1; then
    echo "Installing Node.js via Homebrew..."
    brew install node
elif command -v curl >/dev/null 2>&1; then
    echo "Installing Node.js via direct download..."
    curl -fsSL https://nodejs.org/dist/v20.11.1/node-v20.11.1-darwin-arm64.tar.gz | tar -xz -C /tmp
    sudo cp -R /tmp/node-v20.11.1-darwin-arm64/* /usr/local/
else
    echo "Neither brew nor curl available. Please install Node.js manually."
    exit 1
fi

# Verify installation
if command -v node >/dev/null 2>&1; then
    echo "Node.js installed successfully: $(node --version)"
else
    echo "Node.js installation failed"
    exit 1
fi
