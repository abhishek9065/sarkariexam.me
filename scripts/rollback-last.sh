#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

STATE_FILE="${ROLLBACK_STATE_FILE:-${ROOT_DIR}/.deploy-state/last-release.env}"
TARGET_SHA=""
ROLLBACK_MODE=""
CONFIRM_ROLLBACK=0
REPO_DIR="${DO_REPO_DIR:-${REPO_DIR_OVERRIDE:-$ROOT_DIR}}"

log() {
  echo "[rollback-last] $*"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: rollback-last.sh [--state-file <path>] [--sha <commit>] [--mode fast|full] [--yes]

By default, reads .deploy-state/last-release.env and proposes rollback to PREVIOUS_SHA.

Options:
  --state-file <path>   Release state file path. Default: .deploy-state/last-release.env
  --sha <commit>        Explicit rollback target SHA (overrides PREVIOUS_SHA from state)
  --mode <fast|full>    Deploy mode for rollback. Defaults to state value or fast
  --yes                 Execute rollback immediately
  -h, --help            Show this help
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --state-file)
        [[ $# -ge 2 ]] || die "--state-file requires a path"
        STATE_FILE="$2"
        shift 2
        ;;
      --sha)
        [[ $# -ge 2 ]] || die "--sha requires a 40-character commit SHA"
        TARGET_SHA="$2"
        shift 2
        ;;
      --mode)
        [[ $# -ge 2 ]] || die "--mode requires fast or full"
        ROLLBACK_MODE="$2"
        shift 2
        ;;
      --yes)
        CONFIRM_ROLLBACK=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done
}

resolve_state_file() {
  if [[ "$STATE_FILE" != /* ]]; then
    STATE_FILE="$ROOT_DIR/$STATE_FILE"
  fi
}

load_release_state() {
  local initial_repo_dir="${REPO_DIR}"

  [[ -f "$STATE_FILE" ]] || die "Release state file not found: ${STATE_FILE}"

  # shellcheck disable=SC1090
  source "$STATE_FILE"

  if [[ -n "${DO_REPO_DIR:-${REPO_DIR_OVERRIDE:-}}" ]]; then
    REPO_DIR="$initial_repo_dir"
  fi

  if [[ -z "$TARGET_SHA" ]]; then
    TARGET_SHA="${PREVIOUS_SHA:-}"
  fi

  if [[ -z "$ROLLBACK_MODE" ]]; then
    ROLLBACK_MODE="${DEPLOY_MODE:-${ROLLBACK_DEPLOY_MODE:-fast}}"
  fi

  if [[ -z "$TARGET_SHA" ]]; then
    die "Rollback SHA is empty. Set --sha or ensure PREVIOUS_SHA exists in ${STATE_FILE}."
  fi

  if [[ ! "$TARGET_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
    die "Rollback SHA must be a 40-character commit SHA. Received: ${TARGET_SHA}"
  fi

  case "$ROLLBACK_MODE" in
    fast|full)
      ;;
    *)
      die "Unsupported rollback mode: ${ROLLBACK_MODE}"
      ;;
  esac

  if [[ "$REPO_DIR" != /* ]]; then
    die "DO_REPO_DIR must be an absolute path. Received: ${REPO_DIR}"
  fi
}

execute_rollback() {
  log "State file: ${STATE_FILE}"
  log "Repo dir: ${REPO_DIR}"
  log "Rollback target SHA: ${TARGET_SHA}"
  log "Rollback mode: ${ROLLBACK_MODE}"

  if [[ "$CONFIRM_ROLLBACK" != "1" ]]; then
    echo
    echo "Dry-run only. Re-run with --yes to execute rollback."
    echo "Command preview: DO_REPO_DIR=${REPO_DIR} bash scripts/deploy-live.sh --mode ${ROLLBACK_MODE} --sha ${TARGET_SHA}"
    exit 0
  fi

  DO_REPO_DIR="$REPO_DIR" bash "${SCRIPT_DIR}/deploy-live.sh" --mode "$ROLLBACK_MODE" --sha "$TARGET_SHA"
}

parse_args "$@"
resolve_state_file
load_release_state
execute_rollback
