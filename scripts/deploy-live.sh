#!/usr/bin/env bash

set -Eeuo pipefail

LOCK_FILE="/tmp/sarkari-result-deploy.lock"
LOG_FILE="/tmp/sarkari-result-deploy.log"
LOCK_WAIT_SECONDS="${LOCK_WAIT_SECONDS:-900}"

CURRENT_STAGE="init"
LAST_ACTIONABLE_DIAGNOSIS="Inspect the remote deploy log and deployment helper output."

DO_PREFLIGHT_ONLY=0
DEPLOY_MODE="fast"
TARGET_SHA=""
REPO_DIR="${DO_REPO_DIR:-${REPO_DIR_OVERRIDE:-}}"
PREVIOUS_SHA=""
PREVIOUS_REF=""

log() {
  echo "[deploy-live] $*"
}

set_stage() {
  CURRENT_STAGE="$1"
  log "stage=${CURRENT_STAGE}"
}

record_diagnosis() {
  LAST_ACTIONABLE_DIAGNOSIS="$1"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: deploy-live.sh --sha <commit> [--mode fast|full] [--preflight-only]

Required environment:
  DO_REPO_DIR   Absolute path to the checked-out production repository on the droplet.

Options:
  --sha <commit>       Commit SHA to deploy.
  --mode <fast|full>   Deploy mode. Default: fast
  --preflight-only     Validate prerequisites without restarting services.
EOF
}

on_error() {
  local exit_code="$?"
  local line_number="${1:-unknown}"

  echo
  echo "ERROR: remote deployment failed during stage '${CURRENT_STAGE}' at line ${line_number}."
  echo "Actionable diagnosis: ${LAST_ACTIONABLE_DIAGNOSIS}"
  echo "Repo path: ${REPO_DIR:-unset}"
  echo "Target SHA: ${TARGET_SHA:-unset}"
  echo "Previous SHA: ${PREVIOUS_SHA:-unknown}"
  echo "Log file: ${LOG_FILE}"
  exit "$exit_code"
}

trap 'on_error $LINENO' ERR

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --sha)
        [[ $# -ge 2 ]] || die "--sha requires a commit SHA"
        TARGET_SHA="$2"
        shift 2
        ;;
      --mode)
        [[ $# -ge 2 ]] || die "--mode requires a value"
        DEPLOY_MODE="$2"
        shift 2
        ;;
      --preflight-only)
        DO_PREFLIGHT_ONLY=1
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done
}

require_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1 || die "Missing required command: ${command_name}"
}

require_file() {
  local file_path="$1"
  [[ -f "$file_path" ]] || die "Missing required file: ${file_path}"
}

validate_mode() {
  case "$DEPLOY_MODE" in
    fast|full)
      ;;
    *)
      die "Unsupported deploy mode: ${DEPLOY_MODE}"
      ;;
  esac
}

ensure_git_safe_directory() {
  git config --global --add safe.directory "$REPO_DIR" >/dev/null 2>&1 || true
}

require_clean_checkout() {
  local status_output
  status_output="$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)"

  if [[ -n "$status_output" && "${DEPLOY_AUTOCLEAN_TRACKED:-1}" == "1" ]]; then
    local allowlist_raw allowlist_entry
    local -a allowlist=()
    local -a restore_paths=()
    local can_autoclean=1

    allowlist_raw="${DEPLOY_AUTOCLEAN_TRACKED_PATHS:-backend/package-lock.json}"
    IFS=',' read -r -a allowlist <<< "$allowlist_raw"

    while IFS= read -r line; do
      [[ -n "$line" ]] || continue

      local status_code changed_path
      local is_allowlisted=0

      status_code="${line:0:2}"
      changed_path="${line:3}"

      if [[ "$status_code" != " M" && "$status_code" != "M " && "$status_code" != "MM" ]]; then
        can_autoclean=0
        break
      fi

      for allowlist_entry in "${allowlist[@]}"; do
        allowlist_entry="${allowlist_entry#"${allowlist_entry%%[![:space:]]*}"}"
        allowlist_entry="${allowlist_entry%"${allowlist_entry##*[![:space:]]}"}"
        if [[ -n "$allowlist_entry" && "$changed_path" == "$allowlist_entry" ]]; then
          is_allowlisted=1
          break
        fi
      done

      if [[ "$is_allowlisted" != "1" ]]; then
        can_autoclean=0
        break
      fi

      restore_paths+=("$changed_path")
    done <<< "$status_output"

    if [[ "$can_autoclean" == "1" && "${#restore_paths[@]}" -gt 0 ]]; then
      echo "Auto-restoring allowlisted tracked modifications before deploy preflight:"
      printf '  - %s\n' "${restore_paths[@]}"
      git -C "$REPO_DIR" restore --worktree --staged -- "${restore_paths[@]}"
      status_output="$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)"
    fi
  fi

  if [[ -n "$status_output" ]]; then
    echo "$status_output"
    die "Production checkout has tracked modifications. Refusing to deploy over local changes."
  fi
}

check_remote_prerequisites() {
  record_diagnosis "Install missing server prerequisites and verify deploy user permissions for Docker and Git."
  require_command bash
  require_command git
  require_command docker
  require_command curl
  require_command flock
  require_command tee

  if ! docker compose version >/dev/null 2>&1; then
    die "Docker Compose plugin is not available. Install Docker Compose v2 on the droplet."
  fi
}

validate_repo_checkout() {
  record_diagnosis "Provision the repository at DO_REPO_DIR and keep the production checkout clean before rerunning deploy."
  [[ -n "$REPO_DIR" ]] || die "DO_REPO_DIR is required."
  [[ "$REPO_DIR" == /* ]] || die "DO_REPO_DIR must be an absolute path. Received: ${REPO_DIR}"
  [[ -d "$REPO_DIR" ]] || die "Configured repository directory does not exist: ${REPO_DIR}"
  [[ -d "$REPO_DIR/.git" ]] || die "Configured repository directory is not a git checkout: ${REPO_DIR}"
  require_file "$REPO_DIR/.env"
}

resolve_target_sha() {
  record_diagnosis "Verify the target commit exists on origin/main and can be checked out cleanly."
  [[ -n "$TARGET_SHA" ]] || die "A target commit SHA is required."
  [[ "$TARGET_SHA" =~ ^[0-9a-fA-F]{40}$ ]] || die "Target commit SHA must be a 40-character git commit SHA."

  PREVIOUS_SHA="$(git -C "$REPO_DIR" rev-parse HEAD)"
  git -C "$REPO_DIR" fetch --prune origin main

  if ! git -C "$REPO_DIR" cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
    git -C "$REPO_DIR" fetch --no-tags origin "$TARGET_SHA"
    git -C "$REPO_DIR" cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null || die "Target commit SHA is not available from origin: ${TARGET_SHA}"
  fi

  git -C "$REPO_DIR" merge-base --is-ancestor "$TARGET_SHA" "origin/main" || die "Target commit SHA is not reachable from origin/main: ${TARGET_SHA}"
}

validate_target_tree_files() {
  local required_paths=(
    "docker-compose.yml"
    "scripts/deploy-common.sh"
    "scripts/deploy-fast.sh"
    "scripts/deploy-prod.sh"
  )
  local missing_paths=()
  local path

  for path in "${required_paths[@]}"; do
    if ! git -C "$REPO_DIR" cat-file -e "${TARGET_SHA}:${path}" 2>/dev/null; then
      missing_paths+=("$path")
    fi
  done

  if [[ "${#missing_paths[@]}" -gt 0 ]]; then
    echo "Target commit ${TARGET_SHA} is missing required deploy file(s):"
    printf '  - %s\n' "${missing_paths[@]}"
    die "Target commit cannot be deployed with the current remote helper."
  fi
}

checkout_target_sha() {
  record_diagnosis "Resolve checkout conflicts in production working tree and retry exact target SHA checkout."
  local current_sha

  current_sha="$(git -C "$REPO_DIR" rev-parse HEAD)"
  PREVIOUS_SHA="$current_sha"
  PREVIOUS_REF="$(git -C "$REPO_DIR" symbolic-ref -q --short HEAD || true)"

  if [[ "$current_sha" == "$TARGET_SHA" ]]; then
    echo "Repository already checked out at target SHA ${TARGET_SHA}."
    return 0
  fi

  git -C "$REPO_DIR" checkout --detach "$TARGET_SHA"
}

restore_previous_checkout_after_preflight() {
  [[ -n "$PREVIOUS_SHA" ]] || return 0

  local current_sha
  current_sha="$(git -C "$REPO_DIR" rev-parse HEAD)"
  if [[ "$current_sha" == "$PREVIOUS_SHA" ]]; then
    return 0
  fi

  if [[ -n "$PREVIOUS_REF" ]]; then
    git -C "$REPO_DIR" checkout "$PREVIOUS_REF"
  else
    git -C "$REPO_DIR" checkout --detach "$PREVIOUS_SHA"
  fi
}

run_preflight_checks() {
  record_diagnosis "Review ${REPO_DIR}/.env, Docker Compose availability, and compose rendering on the droplet."
  (
    cd "$REPO_DIR"
    docker compose -f docker-compose.yml --project-name "${COMPOSE_PROJECT_NAME:-sarkari-result}" --env-file .env config >/dev/null
  )
}

run_deploy() {
  record_diagnosis "Inspect /tmp/sarkari-result-deploy.log and Docker Compose service logs for deployment-stage failures."

  export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sarkari-result}"
  export DEPLOY_TARGET_SHA="$TARGET_SHA"
  export DEPLOY_PREVIOUS_SHA="$PREVIOUS_SHA"
  export DEPLOY_REPO_DIR="$REPO_DIR"
  export DEPLOY_MODE

  cd "$REPO_DIR"
  if [[ "$DEPLOY_MODE" == "fast" ]]; then
    bash scripts/deploy-fast.sh
  else
    bash scripts/deploy-prod.sh
  fi
}

parse_args "$@"
validate_mode

mkdir -p "$(dirname "$LOG_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -w "$LOCK_WAIT_SECONDS" 9; then
  die "Timed out waiting for deploy lock after ${LOCK_WAIT_SECONDS}s. Another deployment may still be running."
fi

: >"$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Remote deploy started at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
echo "Repo path: ${REPO_DIR:-unset}"
echo "Requested SHA: ${TARGET_SHA:-unset}"
echo "Mode: ${DEPLOY_MODE}"
echo "Preflight only: ${DO_PREFLIGHT_ONLY}"
echo "Log file: ${LOG_FILE}"

set_stage "check-prerequisites"
check_remote_prerequisites

set_stage "validate-repo"
validate_repo_checkout
ensure_git_safe_directory
require_clean_checkout

set_stage "resolve-target-sha"
resolve_target_sha

set_stage "validate-target-tree"
validate_target_tree_files

set_stage "checkout-target-sha"
checkout_target_sha

set_stage "preflight-compose"
run_preflight_checks

if [[ "$DO_PREFLIGHT_ONLY" == "1" ]]; then
  set_stage "restore-checkout"
  restore_previous_checkout_after_preflight

  current_sha="$(git -C "$REPO_DIR" rev-parse HEAD)"
  echo "REMOTE PREFLIGHT OK"
  echo "  repo_path: ${REPO_DIR}"
  echo "  previous_sha: ${PREVIOUS_SHA}"
  echo "  validated_sha: ${TARGET_SHA}"
  echo "  current_sha: ${current_sha}"
  echo "  target_sha: ${TARGET_SHA}"
  echo "  mode: ${DEPLOY_MODE}"
  echo "=== Remote deploy preflight finished at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
  exit 0
fi

set_stage "deploy"
run_deploy

echo "REMOTE DEPLOY COMPLETE"
echo "  previous_sha: ${PREVIOUS_SHA}"
echo "  deployed_sha: ${TARGET_SHA}"
echo "  repo_path: ${REPO_DIR}"
echo "  mode: ${DEPLOY_MODE}"
echo "=== Remote deploy finished at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
