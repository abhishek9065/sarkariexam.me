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

is_checkout_without_env() {
  local dir="$1"
  has_git_checkout "$dir" && has_deploy_script "$dir" && ! has_root_env "$dir"
}

RESOLVED_REPO_MISSING_ENV=0

resolve_repo_dir() {
  if [[ -n "${REPO_DIR_OVERRIDE:-}" ]]; then
    if is_valid_repo_dir "${REPO_DIR_OVERRIDE}"; then
      printf '%s' "${REPO_DIR_OVERRIDE}"
      return 0
    fi

    if is_checkout_without_env "${REPO_DIR_OVERRIDE}"; then
      RESOLVED_REPO_MISSING_ENV=1
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

  if is_checkout_without_env "$PRIMARY_REPO_DIR"; then
    RESOLVED_REPO_MISSING_ENV=1
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

    if is_checkout_without_env "$candidate"; then
      RESOLVED_REPO_MISSING_ENV=1
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

    if is_checkout_without_env "$discovered_repo"; then
      RESOLVED_REPO_MISSING_ENV=1
      printf '%s' "$discovered_repo"
      return 0
    fi
  done < <(find "$HOME" -maxdepth 6 -type f -path '*/scripts/deploy-live.sh' 2>/dev/null | head -n 20 || true)

  echo "ERROR: no deployment checkout with scripts/deploy-live.sh was found." >&2
  echo "Checked: $PRIMARY_REPO_DIR, $HOME/sarkari-result, /opt/sarkariexam.me, /opt/sarkari-result, /var/www/sarkariexam.me, /var/www/sarkari-result, /srv/sarkariexam.me, /srv/sarkari-result, and discovered paths under $HOME." >&2
  exit 1
}

write_env_from_container() {
  local container_name="$1"
  local container_id
  container_id="$(docker ps -aq --filter "name=^/${container_name}$" | head -n1 || true)"
  [[ -z "$container_id" ]] && return 1

  local tmp_env
  tmp_env="$(mktemp)"

  if ! docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container_id" >"$tmp_env" 2>/dev/null; then
    rm -f "$tmp_env"
    return 1
  fi

  if ! grep -Eq '^(JWT_SECRET|COSMOS_CONNECTION_STRING|MONGODB_URI|POSTGRES_PRISMA_URL|DATABASE_URL)=' "$tmp_env"; then
    rm -f "$tmp_env"
    return 1
  fi

  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$tmp_env" > .env || true
  rm -f "$tmp_env"

  [[ -s .env ]]
}

ensure_root_env() {
  if [[ -f .env ]]; then
    return 0
  fi

  local fallback
  for fallback in \
    "backend/.env" \
    ".env.production" \
    "/etc/sarkari-result/.env" \
    "/etc/sarkariexam/.env" \
    "$HOME/sarkari-result.env"; do
    if [[ -f "$fallback" ]]; then
      cp "$fallback" .env
      echo "NOTICE: created root .env from fallback source: $fallback"
      return 0
    fi
  done

  if command -v docker >/dev/null 2>&1; then
    if write_env_from_container "sarkari-backend"; then
      echo "NOTICE: created root .env from running sarkari-backend container env."
      return 0
    fi
    if write_env_from_container "sarkari-frontend"; then
      echo "NOTICE: created root .env from running sarkari-frontend container env."
      return 0
    fi
  fi

  echo "ERROR: root .env is missing at $REPO_DIR/.env and no fallback env source was found." >&2
  echo "Checked fallback files: backend/.env, .env.production, /etc/sarkari-result/.env, /etc/sarkariexam/.env, and $HOME/sarkari-result.env." >&2
  echo "Also attempted to recover env from running sarkari-backend/sarkari-frontend containers." >&2
  return 1
}

ensure_git_safe_directory() {
  git config --global --add safe.directory "$REPO_DIR" >/dev/null 2>&1 || true
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
if [[ "$RESOLVED_REPO_MISSING_ENV" -eq 1 ]]; then
  echo "NOTICE: selected checkout is missing root .env; attempting env recovery before deploy."
fi

cd "$REPO_DIR"
ensure_root_env
ensure_git_safe_directory

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  echo "NOTICE: production checkout contains local changes or untracked files."
  git status --short
fi

deploy_target_sha="${DEPLOY_GIT_SHA:-}"

if [[ -n "$deploy_target_sha" ]]; then
  echo "=== Syncing repository to commit $deploy_target_sha ==="
else
  echo "=== Syncing repository ==="
fi

git fetch --prune origin main

if [[ -n "$deploy_target_sha" ]]; then
  if ! git cat-file -e "${deploy_target_sha}^{commit}" 2>/dev/null; then
    echo "WARN: target commit $deploy_target_sha not present locally after main fetch. Attempting direct fetch."
    if ! git fetch origin "$deploy_target_sha"; then
      echo "ERROR: unable to fetch target commit $deploy_target_sha from origin." >&2
      exit 1
    fi
  fi

  if ! git checkout --detach "$deploy_target_sha"; then
    echo "WARN: failed to checkout target commit. Attempting checkout recovery."

    if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
      stash_label="deploy-autostash-$(date -u +"%Y%m%dT%H%M%SZ")"
      git stash push --include-untracked -m "$stash_label" || true
      echo "NOTICE: saved local checkout changes to stash: $stash_label"
    fi

    git fetch --prune origin main
    if ! git cat-file -e "${deploy_target_sha}^{commit}" 2>/dev/null; then
      if ! git fetch origin "$deploy_target_sha"; then
        echo "ERROR: unable to fetch target commit $deploy_target_sha during recovery." >&2
        exit 1
      fi
    fi
    git checkout --detach "$deploy_target_sha"
  fi
else
  git checkout main

  if ! git pull --ff-only origin main; then
    echo "WARN: fast-forward pull failed. Attempting checkout recovery."

    if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
      stash_label="deploy-autostash-$(date -u +"%Y%m%dT%H%M%SZ")"
      git stash push --include-untracked -m "$stash_label" || true
      echo "NOTICE: saved local checkout changes to stash: $stash_label"
    fi

    git fetch --prune origin main
    git checkout -B main origin/main
  fi
fi

export COMPOSE_PROJECT_NAME="sarkari-result"

# Use fast deployment by default, fallback to full deployment
DEPLOY_MODE="${DEPLOY_MODE:-fast}"

if [[ "$DEPLOY_MODE" == "fast" ]]; then
  echo "=== Running FAST deployment (GitHub Actions triggered rebuild on droplet) ==="
  echo "To use full deployment, set: DEPLOY_MODE=full"
  export SKIP_CONFIG_VALIDATION="${SKIP_CONFIG_VALIDATION:-0}"
  export SKIP_FRONTEND_CHECKS=1
  export SKIP_PUBLIC_CHECKS=0  # Keep essential public checks
  export SKIP_CACHE_PURGE=0
  bash scripts/deploy-fast.sh
else
  echo "=== Running FULL deployment (GitHub Actions triggered rebuild + full verification) ==="
  bash scripts/deploy-prod.sh
fi

echo "=== Deploy finished at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
