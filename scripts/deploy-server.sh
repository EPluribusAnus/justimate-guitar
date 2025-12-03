#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="/opt/justimate"
REPO_URL="https://github.com/EPluribusAnus/justimate-guitar"
APP_NAME="justimate"
PORT="${PORT:-4173}"
HOST="${HOST:-0.0.0.0}"

echo "==> Deploying ${APP_NAME} to ${TARGET_DIR}"
echo "    Repo: ${REPO_URL}"
echo "    PORT: ${PORT} | HOST: ${HOST}"

echo "==> Switching to /opt"
cd /opt

echo "==> Removing existing ${TARGET_DIR}"
rm -rf "${TARGET_DIR}/"

echo "==> Cloning fresh copy"
git clone "${REPO_URL}" "${TARGET_DIR}"

echo "==> Entering ${TARGET_DIR}"
cd "${TARGET_DIR}"

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Building app (npm run build)"
npm run build

echo "==> Restarting PM2 app (${APP_NAME})"
pm2 delete "${APP_NAME}" || true
pm2 start "PORT=${PORT} HOST=${HOST} node server-dist/index.js" --name "${APP_NAME}"

echo "==> Saving PM2 process list"
pm2 save

echo "==> Deploy complete"
