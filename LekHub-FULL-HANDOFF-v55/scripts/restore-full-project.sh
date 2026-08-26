#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-LekHub-restored}"
git clone https://github.com/butusprc-jpg/LekHub.git "$TARGET"
cd "$TARGET"
git checkout 4da51eb0ce41f1cde572db586f778caab8932a54
echo "Clone complete."
echo "Now copy LATEST_OVERLAY/* from this handoff over the cloned project, preserving paths."
echo "Then run: npm install && npm run build"
