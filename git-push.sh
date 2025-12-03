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

read -rp "New version (e.g., v7.0.3): " NEW_VERSION
if [[ -z "${NEW_VERSION// }" ]]; then
  echo "Version is required."
  exit 1
fi

VERSION_FILE="src/version.ts"
if [[ ! -f "$VERSION_FILE" ]]; then
  echo "Version file not found at $VERSION_FILE"
  exit 1
fi

python3 - "$NEW_VERSION" "$VERSION_FILE" <<'PYCODE'
import pathlib
import re
import sys

version = sys.argv[1]
path = pathlib.Path(sys.argv[2])
text = path.read_text()
pattern = re.compile(r"(export const appVersion = ')([^']*)(';\s*)")

def repl(match: re.Match) -> str:
    return f"{match.group(1)}{version}{match.group(3)}"

if not pattern.search(text):
    sys.stderr.write("Could not find appVersion assignment\n")
    sys.exit(1)

updated, count = pattern.subn(repl, text, count=1)
if count != 1:
    sys.stderr.write("Failed to update appVersion\n")
    sys.exit(1)

path.write_text(updated)
print(f"Updated {path} to {version}")
PYCODE

git status --short "$VERSION_FILE"

git status
git add -A
git commit -m "$COMMIT_MSG"
git push origin main
