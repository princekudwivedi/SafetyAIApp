#!/bin/bash
# Fetch the previous commit and compare
git fetch origin "$VERCEL_GIT_COMMIT_REF" --depth=2 >/dev/null 2>&1 || true
CHANGED="$(git diff --name-only HEAD^ HEAD || true)"
if ! echo "$CHANGED" | grep -q '^frontend/'; then
  echo "No changes in frontend/ — skipping Vercel build."
  exit 0
fi
# If we reach here, Vercel proceeds with the build
