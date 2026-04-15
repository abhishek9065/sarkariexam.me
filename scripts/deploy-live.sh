#!/usr/bin/env bash

set -euo pipefail

PRIMARY_REPO_DIR="$HOME/sarkari-result"
FALLBACK_REPO_DIR="$HOME/sarkariexam.me"
LOCK_FILE="/tmp/sarkari-result-deploy.lock"
LOG_FILE="/tmp/sarkari-result-deploy.log"
LOCK_WAIT_SECONDS="${LOCK_WAIT_SECONDS:-900}"

resolve_repo_dir() {
  if [[ -n "${REPO_DIR_OVERRIDE:-}" && -d "${REPO_DIR_OVERRIDE}" ]]; then
    printf '%s' "${REPO_DIR_OVERRIDE}"
    return 0
  fi

  if [[ -d "$PRIMARY_REPO_DIR" ]]; then
    printf '%s' "$PRIMARY_REPO_DIR"
    return 0
  fi

  if [[ -d "$FALLBACK_REPO_DIR" ]]; then
    printf '%s' "$FALLBACK_REPO_DIR"
    return 0
  fi

  for candidate in /opt/sarkari-result /var/www/sarkari-result /srv/sarkari-result; do
    if [[ -d "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  discovered_script="$(find "$HOME" -maxdepth 4 -type f -path '*/scripts/deploy-live.sh' 2>/dev/null | head -n 1 || true)"
  if [[ -n "$discovered_script" ]]; then
    dirname "$(dirname "$discovered_script")"
    return 0
  fi

  echo "ERROR: deployment checkout not found at $PRIMARY_REPO_DIR or $FALLBACK_REPO_DIR" >&2
  exit 1
}

REPO_DIR="$(resolve_repo_dir)"
mkdir -p "$(dirname "$LOG_FILE")"

exec 9>"$LOCK_FILE"
if ! flock -w "$LOCK_WAIT_SECONDS" 9; then
  echo "ERROR: another deployment is already running and lock wait timed out after ${LOCK_WAIT_SECONDS}s. Lock file: $LOCK_FILE" >&2
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

if ! git pull --ff-only origin main; then
  echo "WARN: fast-forward pull failed. Attempting checkout recovery."

  if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
    stash_label="deploy-autostash-$(date -u +"%Y%m%dT%H%M%SZ")"
    git stash push --include-untracked -m "$stash_label" || true
    echo "NOTICE: saved local checkout changes to stash: $stash_label"
  fi

  git fetch origin main
  git checkout -B main origin/main
fi

export COMPOSE_PROJECT_NAME="sarkari-result"

# Use fast deployment by default, fallback to full deployment
DEPLOY_MODE="${DEPLOY_MODE:-fast}"

if [[ "$DEPLOY_MODE" == "fast" ]]; then
  echo "=== Running FAST deployment (GitHub Actions triggered rebuild on droplet) ==="
  echo "To use full deployment, set: DEPLOY_MODE=full"
  export SKIP_CONFIG_VALIDATION=1
  export SKIP_FRONTEND_CHECKS=1
  export SKIP_PUBLIC_CHECKS=0  # Keep essential public checks
  export SKIP_CACHE_PURGE=0
  bash scripts/deploy-fast.sh
else
  echo "=== Running FULL deployment (GitHub Actions triggered rebuild + full verification) ==="
  bash scripts/deploy-prod.sh
fi

echo "=== Deploy finished at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
