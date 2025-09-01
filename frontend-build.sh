#!/bin/bash
git fetch origin "$VERCEL_GIT_COMMIT_REF" --depth=2 >/dev/null 2>&1 || true
CHANGED="$(git diff --name-only HEAD^ HEAD || true)"
echo "$CHANGED" | grep -q '^frontend/' && exit 1  # build
echo "No frontend changes — skip"; exit 0          # skip
