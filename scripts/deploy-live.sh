#!/usr/bin/env bash

set -Eeuo pipefail

LOCK_FILE="/tmp/sarkari-result-deploy.lock"
LOG_FILE="/tmp/sarkari-result-deploy.log"
LOCK_WAIT_SECONDS="${LOCK_WAIT_SECONDS:-900}"
CURRENT_STAGE="init"
LAST_ACTIONABLE_DIAGNOSIS="Inspect the remote deploy log and validate the production checkout and server prerequisites."
DO_PREFLIGHT_ONLY=0
DEPLOY_MODE="fast"
TARGET_SHA=""
REPO_DIR="${DO_REPO_DIR:-${REPO_DIR_OVERRIDE:-}}"
PREVIOUS_SHA=""

log() {
  echo "[deploy-live] $*"
}

warn() {
  echo "WARNING: $*" >&2
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

require_clean_checkout() {
  local status_output
  status_output="$(git -C "$REPO_DIR" status --porcelain --untracked-files=all)"
  if [[ -n "$status_output" ]]; then
    echo "$status_output"
    die "Production checkout is dirty. Refusing to deploy over local modifications or untracked files."
  fi
}

ensure_git_safe_directory() {
  git config --global --add safe.directory "$REPO_DIR" >/dev/null 2>&1 || true
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

check_remote_prerequisites() {
  record_diagnosis "Install the missing server prerequisites and ensure the deploy user can run Docker and Git in ${REPO_DIR}."
  require_command bash
  require_command git
  require_command docker
  require_command curl
  require_command flock
  require_command mktemp
  require_command tee
  if ! docker compose version >/dev/null 2>&1; then
    die "Docker Compose plugin is not available. Install Docker Compose v2 on the droplet."
  fi
}

validate_repo_checkout() {
  record_diagnosis "Provision the repository at DO_REPO_DIR and keep the production checkout clean before rerunning deploy."
  [[ -n "$REPO_DIR" ]] || die "DO_REPO_DIR is required."
  [[ -d "$REPO_DIR" ]] || die "Configured repository directory does not exist: ${REPO_DIR}"
  [[ -d "$REPO_DIR/.git" ]] || die "Configured repository directory is not a git checkout: ${REPO_DIR}"
  require_file "$REPO_DIR/scripts/deploy-live.sh"
  require_file "$REPO_DIR/scripts/deploy-common.sh"
  require_file "$REPO_DIR/scripts/deploy-fast.sh"
  require_file "$REPO_DIR/scripts/deploy-prod.sh"
  require_file "$REPO_DIR/docker-compose.yml"
  require_file "$REPO_DIR/.env"
}

resolve_target_sha() {
  record_diagnosis "Verify the target commit exists on origin and that the production checkout can fetch from the repository remote."
  [[ -n "$TARGET_SHA" ]] || die "A target commit SHA is required."

  PREVIOUS_SHA="$(git -C "$REPO_DIR" rev-parse HEAD)"
  git -C "$REPO_DIR" fetch --prune origin main

  if ! git -C "$REPO_DIR" cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
    git -C "$REPO_DIR" fetch origin "$TARGET_SHA"
    git -C "$REPO_DIR" cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null || die "Target commit SHA is not available from origin: ${TARGET_SHA}"
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
  record_diagnosis "Review the service-specific logs in ${LOG_FILE} and the Docker Compose service logs on the droplet."
  git -C "$REPO_DIR" checkout --detach "$TARGET_SHA"

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
: > "$LOG_FILE"
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

set_stage "preflight-compose"
run_preflight_checks

if [[ "$DO_PREFLIGHT_ONLY" == "1" ]]; then
  echo "REMOTE PREFLIGHT OK"
  echo "  repo_path: ${REPO_DIR}"
  echo "  current_sha: ${PREVIOUS_SHA}"
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
