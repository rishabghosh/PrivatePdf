#!/bin/bash
set -e

# Build the bentopdf-image-effects-wasm crate for web target.
#
# Prerequisites:
#   cargo install wasm-pack
#   (optional) cargo install wasm-opt  OR  brew install binaryen
#
# Usage:
#   cd wasm/bentopdf-image-effects-wasm
#   ./build.sh
#
# Output:
#   pkg/ directory containing:
#     - bentopdf_image_effects_wasm.js       (ES module with init() + exports)
#     - bentopdf_image_effects_wasm_bg.wasm  (compiled WASM binary)
#     - bentopdf_image_effects_wasm.d.ts     (TypeScript type definitions)
#     - package.json                          (npm publish metadata)

echo "Building bentopdf-image-effects-wasm..."

# Build for web target (ES module output)
wasm-pack build --target web --release

# Optimize WASM binary further with wasm-opt (binaryen) if available
if command -v wasm-opt &> /dev/null; then
  echo "Running wasm-opt -Oz..."
  wasm-opt -Oz pkg/bentopdf_image_effects_wasm_bg.wasm \
           -o pkg/bentopdf_image_effects_wasm_bg.wasm
  echo "wasm-opt applied"
else
  echo "wasm-opt not found — skipping. Install binaryen for smaller output."
fi

echo ""
echo "Build complete. Output in pkg/"
echo "Files:"
ls -lh pkg/

echo ""
echo "To test locally:"
echo "  1. Serve pkg/ via a static file server"
echo "  2. Set VITE_WASM_IMAGE_EFFECTS_URL to the URL"
echo "  3. Or run: cargo test (for native unit tests)"
echo "  4. Or run: wasm-pack test --headless --chrome (for browser tests)"
