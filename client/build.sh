#!/bin/bash

set -e  # 一旦出错就退出

echo "Building project..."
npm run build

echo "Moving exported static files..."

TARGET_DIR="../server-go/static/out"

# 删除旧的目标目录
if [ -d "$TARGET_DIR" ]; then
  echo "Removing old static files..."
  rm -rf "$TARGET_DIR"
  mkdir -p "$TARGET_DIR"
else 
  echo "Target Dir do not exist, creating..."
  mkdir -p "$TARGET_DIR"
fi

mv out/* "$TARGET_DIR"
rmdir out
echo "Done! Static site is in $TARGET_DIR"
