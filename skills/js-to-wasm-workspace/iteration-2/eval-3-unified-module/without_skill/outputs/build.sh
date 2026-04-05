#!/usr/bin/env bash
# Build script for the bentopdf-image-effects WASM crate.
#
# Prerequisites:
#   - Rust toolchain: https://rustup.rs
#   - wasm-pack: cargo install wasm-pack
#
# Output is placed in pkg/ with the following files:
#   - bentopdf_image_effects.js       (wasm-bindgen JS glue)
#   - bentopdf_image_effects_bg.wasm  (compiled WASM binary)
#   - bentopdf_image_effects.d.ts     (TypeScript declarations)
#
# To integrate with BentoPDF:
#   1. Copy pkg/* to public/wasm/image-effects/
#   2. Set VITE_WASM_IMAGE_EFFECTS_URL if hosting on CDN
#
# Usage:
#   chmod +x build.sh && ./build.sh

set -euo pipefail

echo "[1/3] Checking prerequisites..."
command -v wasm-pack >/dev/null 2>&1 || {
  echo "Error: wasm-pack not found. Install with: cargo install wasm-pack"
  exit 1
}

echo "[2/3] Building WASM module (release, optimized for size)..."
wasm-pack build \
  --target web \
  --out-dir pkg \
  --release \
  --no-typescript

echo "[3/3] Build complete."
echo ""
echo "Output files:"
ls -lh pkg/*.wasm pkg/*.js 2>/dev/null || echo "(check pkg/ directory)"
echo ""
echo "To deploy:"
echo "  cp pkg/bentopdf_image_effects.js pkg/bentopdf_image_effects_bg.wasm public/wasm/image-effects/"
