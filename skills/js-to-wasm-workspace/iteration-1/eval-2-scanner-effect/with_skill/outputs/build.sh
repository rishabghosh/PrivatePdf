#!/bin/bash
set -e

# Build for web target (ES module output)
wasm-pack build --target web --release

# Optional: optimize WASM binary further with wasm-opt (binaryen)
if command -v wasm-opt &> /dev/null; then
  wasm-opt -Oz pkg/*_bg.wasm -o pkg/*_bg.wasm
  echo "wasm-opt applied"
fi

echo "Build complete. Output in pkg/"
echo "Files:"
ls -lh pkg/
