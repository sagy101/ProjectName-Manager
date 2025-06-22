#!/bin/bash

mkdir -p ~/Applications

ARCH=$(uname -m)

if [[ "$ARCH" == "arm64" ]]; then
  DMG_URL="https://github.com/ungoogled-software/ungoogled-chromium-macos/releases/download/125.0.6422.141-1.1/ungoogled-chromium_125.0.6422.141-1.1_arm64-macos.dmg"
elif [[ "$ARCH" == "x86_64" ]]; then
  DMG_URL="https://github.com/ungoogled-software/ungoogled-chromium-macos/releases/download/125.0.6422.141-1.1/ungoogled-chromium_125.0.6422.141-1.1_x86-64-macos.dmg"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

curl -L -o ungoogled-chromium.dmg "$DMG_URL" && \
hdiutil attach ungoogled-chromium.dmg -quiet && \
cp -R "/Volumes/Chromium/Chromium.app" ~/Applications/ && \
hdiutil detach "/Volumes/Chromium" -quiet && \
rm ungoogled-chromium.dmg && \
open ~/Applications/Chromium.app