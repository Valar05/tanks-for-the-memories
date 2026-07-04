#!/usr/bin/env sh
set -eu

message="${1:-Preserve tank animation proof}"

echo "==> Checking repo state"
git status --short

echo "==> Running verification"
npm run smoke
git diff --check

echo "==> Staging all non-cache project artifacts"
git add -A

excluded_staged="$(git diff --cached --name-only | grep -E '(^|/)node_modules/|(^|/)dist/|(^|/)\.firebase/|\.tsbuildinfo$|(^|/)\.DS_Store$' || true)"
if [ -n "$excluded_staged" ]; then
  echo "$excluded_staged" | while IFS= read -r path; do
    [ -n "$path" ] && git reset -q -- "$path"
  done
fi

echo "==> Verifying staged set excludes cache/build junk"
if git diff --cached --name-only | grep -E '(^|/)node_modules/|(^|/)dist/|(^|/)\.firebase/|\.tsbuildinfo$|(^|/)\.DS_Store$' >/dev/null; then
  echo "Refusing commit: staged cache/build junk detected:" >&2
  git diff --cached --name-only | grep -E '(^|/)node_modules/|(^|/)dist/|(^|/)\.firebase/|\.tsbuildinfo$|(^|/)\.DS_Store$' >&2
  exit 1
fi

if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

echo "==> Staged files"
git diff --cached --name-status

echo "==> Committing"
git commit -m "$message"

echo "==> Pushing"
git push

echo "==> Done"
git rev-parse --short HEAD
