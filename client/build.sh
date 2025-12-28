#!/bin/bash

set -euo pipefail
CLIENT_ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_STATIC_DIR="${CLIENT_ROOT_DIR}/static-server/out/static"
TARGET_OUT_DIR="${TARGET_STATIC_DIR}/out"
TARGET_AVATAR_DIR="${TARGET_STATIC_DIR}/avatars"

echo "Building project..."
npm run build
echo "Moving exported static files..."

if [ -d "$TARGET_OUT_DIR" ]; then
  echo "Removing old static/out files..."
  rm -rf "$TARGET_OUT_DIR"
  mkdir -p "$TARGET_OUT_DIR"
else 
  echo "Target static/out does not exist, creating..."
  mkdir -p "$TARGET_OUT_DIR"
fi

if [ ! -d "$TARGET_AVATAR_DIR" ]; then
  mkdir -p "$TARGET_AVATAR_DIR"
fi

mv out/* "$TARGET_OUT_DIR"
cp "$TARGET_OUT_DIR/placeholder-user.jpg" "$TARGET_AVATAR_DIR"
rmdir out
echo "Done! Static site is in $TARGET_OUT_DIR"
