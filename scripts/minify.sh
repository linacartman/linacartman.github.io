#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
npx --yes esbuild@0.24.2 css/bay.css --minify --outfile=css/bay.min.css
npx --yes esbuild@0.24.2 js/bay.js --minify --outfile=js/bay.min.js
