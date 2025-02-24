#!/bin/bash

# Exit immediately if any command fails
set -e

# Resolve script directory to allow running from anywhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Parse arguments
DEST_DIR=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -out)
      DEST_DIR=$(realpath "$2")
      shift 2
      ;;
    *)
      echo "❌ Unknown argument: $1"
      echo "Usage: $0 [-out /path/to/output]"
      exit 1
      ;;
  esac
done

# Function to handle each package build step
run_build() {
  local package_dir="$1"
  echo "\n🚀 Building $package_dir..."
  cd "$package_dir"

  echo "🧹 Cleaning..."
  yarn clean

  echo "🔨 Building..."
  yarn deploy-build

  echo "🧪 Testing..."
  yarn test

  cd - > /dev/null
}

# Function to handle packaging step
run_package() {
  local package_dir="$1"
  echo "\n📦 Packaging $package_dir..."
  cd "$package_dir"

  yarn package

  cd - > /dev/null
}

# Build and package all packages
run_build "$SCRIPT_DIR/../hcs-lib"
run_package "$SCRIPT_DIR/../hcs-lib"

run_build "$SCRIPT_DIR/../hcs-cli"
run_package "$SCRIPT_DIR/../hcs-cli"

run_build "$SCRIPT_DIR/../hcs-extension"
run_package "$SCRIPT_DIR/../hcs-extension"

# Copy generated packages to destination if provided
if [ -n "$DEST_DIR" ]; then
  mkdir -p "$DEST_DIR"
  echo "\n📤 Copying packaged files to $DEST_DIR..."
  cp "$SCRIPT_DIR/../hcs-lib"/*.tgz "$DEST_DIR"
  cp "$SCRIPT_DIR/../hcs-cli/dist"/*.js "$DEST_DIR"
  cp "$SCRIPT_DIR/../hcs-extension"/*.vsix "$DEST_DIR" 2>/dev/null || echo "⚠️ No VSIX package found for hcs-extension."
  echo "✅ All packages have been built, packaged, and copied to $DEST_DIR."
else
  echo "✅ All packages have been built and packaged successfully (no output directory specified)."
fi
