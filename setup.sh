#!/bin/bash
set -e
# Install nvm if not present
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
fi
source "$HOME/.nvm/nvm.sh"
# Install and use the required Node.js version
nvm install 22.16.0
nvm use 22.16.0
