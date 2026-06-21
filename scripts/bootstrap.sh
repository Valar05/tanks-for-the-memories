#!/bin/sh
set -eu
npm install --no-fund --no-audit --progress=false
npm run smoke
