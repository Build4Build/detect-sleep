#!/bin/bash

# Download and install Node.js to the expected path
echo "Setting up Node.js for Hermes build..."

# Create directory structure
sudo mkdir -p /opt/homebrew/Cellar/node/23.9.0/bin

# Download Node.js v20 (stable LTS)
curl -L https://nodejs.org/dist/v20.11.1/node-v20.11.1-darwin-arm64.tar.gz -o /tmp/node.tar.gz

# Extract and install
cd /tmp
tar -xzf node.tar.gz

# Copy node binary to expected location
sudo cp node-v20.11.1-darwin-arm64/bin/node /opt/homebrew/Cellar/node/23.9.0/bin/node
sudo chmod +x /opt/homebrew/Cellar/node/23.9.0/bin/node

# Also copy to standard locations for safety
sudo cp node-v20.11.1-darwin-arm64/bin/node /usr/local/bin/node
sudo chmod +x /usr/local/bin/node

echo "Node.js installed successfully"
/opt/homebrew/Cellar/node/23.9.0/bin/node --version
