#!/usr/bin/env bash

set -euo pipefail

PRIMARY_REPO_DIR="$HOME/sarkari-result"
FALLBACK_REPO_DIR="$HOME/sarkariexam.me"
LOCK_FILE="/tmp/sarkari-result-deploy.lock"
LOG_FILE="/tmp/sarkari-result-deploy.log"

resolve_repo_dir() {
  if [[ -d "$PRIMARY_REPO_DIR" ]]; then
    printf '%s' "$PRIMARY_REPO_DIR"
    return 0
  fi

  if [[ -d "$FALLBACK_REPO_DIR" ]]; then
    printf '%s' "$FALLBACK_REPO_DIR"
    return 0
  fi

  echo "ERROR: deployment checkout not found at $PRIMARY_REPO_DIR or $FALLBACK_REPO_DIR" >&2
  exit 1
}

REPO_DIR="$(resolve_repo_dir)"
mkdir -p "$(dirname "$LOG_FILE")"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "ERROR: another deployment is already running. Lock file: $LOCK_FILE" >&2
  exit 1
fi

exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Deploy started at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
echo "Repository: $REPO_DIR"
echo "Log file: $LOG_FILE"

cd "$REPO_DIR"

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  echo "NOTICE: production checkout contains local changes or untracked files."
  git status --short
fi

echo "=== Syncing repository ==="
git fetch origin main
git checkout main
git pull --ff-only origin main

export COMPOSE_PROJECT_NAME="sarkari-result"

echo "=== Running guarded compose deploy ==="
bash scripts/deploy-prod.sh

echo "=== Deploy finished at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
