#!/usr/bin/env bash

set -euo pipefail

PRIMARY_REPO_DIR="$HOME/sarkariexam.me"
LOCK_FILE="/tmp/sarkari-result-deploy.lock"
LOG_FILE="/tmp/sarkari-result-deploy.log"
LOCK_WAIT_SECONDS="${LOCK_WAIT_SECONDS:-900}"

has_git_checkout() {
  local dir="$1"
  [[ -d "$dir/.git" ]]
}

has_deploy_script() {
  local dir="$1"
  [[ -f "$dir/scripts/deploy-live.sh" ]]
}

has_root_env() {
  local dir="$1"
  [[ -f "$dir/.env" ]]
}

is_valid_repo_dir() {
  local dir="$1"
  has_git_checkout "$dir" && has_deploy_script "$dir" && has_root_env "$dir"
}

resolve_repo_dir() {
  if [[ -n "${REPO_DIR_OVERRIDE:-}" ]]; then
    if is_valid_repo_dir "${REPO_DIR_OVERRIDE}"; then
      printf '%s' "${REPO_DIR_OVERRIDE}"
      return 0
    fi

    if ! has_git_checkout "${REPO_DIR_OVERRIDE}"; then
      echo "NOTICE: REPO_DIR_OVERRIDE is not a git checkout: ${REPO_DIR_OVERRIDE}" >&2
    elif ! has_deploy_script "${REPO_DIR_OVERRIDE}"; then
      echo "NOTICE: REPO_DIR_OVERRIDE is missing scripts/deploy-live.sh: ${REPO_DIR_OVERRIDE}" >&2
    elif ! has_root_env "${REPO_DIR_OVERRIDE}"; then
      echo "NOTICE: REPO_DIR_OVERRIDE is missing root .env: ${REPO_DIR_OVERRIDE}" >&2
      echo "NOTICE: falling back to automatic checkout discovery." >&2
    fi
  fi

  if is_valid_repo_dir "$PRIMARY_REPO_DIR"; then
    printf '%s' "$PRIMARY_REPO_DIR"
    return 0
  fi

  for candidate in \
    "$HOME/sarkari-result" \
    /opt/sarkariexam.me \
    /opt/sarkari-result \
    /var/www/sarkariexam.me \
    /var/www/sarkari-result \
    /srv/sarkariexam.me \
    /srv/sarkari-result; do
    if is_valid_repo_dir "$candidate"; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  while IFS= read -r discovered_script; do
    [[ -z "$discovered_script" ]] && continue
    discovered_repo="$(dirname "$(dirname "$discovered_script")")"
    if is_valid_repo_dir "$discovered_repo"; then
      printf '%s' "$discovered_repo"
      return 0
    fi
  done < <(find "$HOME" -maxdepth 6 -type f -path '*/scripts/deploy-live.sh' 2>/dev/null | head -n 20 || true)

  echo "ERROR: no deployment checkout with scripts/deploy-live.sh and root .env was found." >&2
  echo "Checked: $PRIMARY_REPO_DIR, $HOME/sarkari-result, /opt/sarkariexam.me, /opt/sarkari-result, /var/www/sarkariexam.me, /var/www/sarkari-result, /srv/sarkariexam.me, /srv/sarkari-result, and discovered paths under $HOME." >&2
  exit 1
}

REPO_DIR="$(resolve_repo_dir)"
mkdir -p "$(dirname "$LOG_FILE")"

exec 9>"$LOCK_FILE"
if command -v flock >/dev/null 2>&1; then
  if ! flock -w "$LOCK_WAIT_SECONDS" 9; then
    echo "ERROR: another deployment is already running and lock wait timed out after ${LOCK_WAIT_SECONDS}s. Lock file: $LOCK_FILE" >&2
    exit 1
  fi
else
  echo "NOTICE: flock is not available; continuing without deployment lock."
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
