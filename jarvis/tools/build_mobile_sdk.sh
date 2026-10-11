#!/usr/bin/env bash
# Rebuilds mobile/vendor/anthropic-sdk.min.js (browser ESM bundle of the official SDK).
set -euo pipefail
VERSION="${1:-0.127.0}"
here="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
cd "$tmp"
npm init -y >/dev/null
npm install -q "@anthropic-ai/sdk@$VERSION" esbuild@0.24.0 >/dev/null
echo "export { default, APIError, AuthenticationError, APIConnectionError, RateLimitError } from '@anthropic-ai/sdk';" > entry.js
npx esbuild entry.js --bundle --format=esm --platform=browser --minify --target=es2020 --outfile="$here/mobile/vendor/anthropic-sdk.min.js"
cp node_modules/@anthropic-ai/sdk/LICENSE "$here/mobile/vendor/anthropic-sdk.LICENSE"
echo "built @anthropic-ai/sdk@$VERSION"
