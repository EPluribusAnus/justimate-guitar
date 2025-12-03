#!/usr/bin/env bash
set -euo pipefail

# Verify we're in a git repo.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

# If there are no changes to commit, bail early.
if git status --porcelain --untracked-files=all | grep . >/dev/null 2>&1; then
  :
else
  echo "Nothing to commit or push."
  exit 0
fi

read -rp "Commit message: " COMMIT_MSG
if [[ -z "${COMMIT_MSG// }" ]]; then
  echo "Commit message required."
  exit 1
fi

git status
git add -A
git commit -m "$COMMIT_MSG"
git push origin main
