#!/usr/bin/env bash

set -Eeuo pipefail

CURRENT_STAGE="init"
REMOTE_LOG_FILE="/tmp/sarkari-result-deploy.log"
REMOTE_HELPER_PATH="/tmp/sarkari-result-deploy-live-${GITHUB_RUN_ID:-$$}.sh"
SSH_CMD=()
SCP_CMD=()

log() {
  echo "[deploy-via-ssh] $*"
}

warn() {
  echo "[deploy-via-ssh] WARNING: $*" >&2
}

set_stage() {
  CURRENT_STAGE="$1"
  log "stage=${CURRENT_STAGE}"
}

append_summary_line() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' "${1:-}" >> "$GITHUB_STEP_SUMMARY"
  fi
}

trim_whitespace() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

quote_for_remote_shell() {
  local value="$1"
  printf "'%s'" "${value//\'/\'\"\'\"\'}"
}

fail() {
  local message="$1"
  echo "::error title=Deploy failed::stage=${CURRENT_STAGE} ${message}" >&2

  append_summary_line "## Deploy Failure"
  append_summary_line
  append_summary_line "- Stage: \`${CURRENT_STAGE}\`"
  append_summary_line "- Branch: \`${TRIGGER_BRANCH:-unknown}\`"
  append_summary_line "- Event: \`${TRIGGER_EVENT:-unknown}\`"
  append_summary_line "- Conclusion: \`${TRIGGER_CONCLUSION:-unknown}\`"
  append_summary_line "- Target SHA: \`${TRIGGER_SHA:-unknown}\`"
  append_summary_line "- Diagnosis: ${message}"
  exit 1
}

cleanup_remote_helper() {
  if [[ ${#SSH_CMD[@]} -eq 0 ]]; then
    return 0
  fi

  "${SSH_CMD[@]}" "rm -f '$REMOTE_HELPER_PATH'" >/dev/null 2>&1 || true
}

trap cleanup_remote_helper EXIT

require_var() {
  local key="$1"
  if [[ -z "$(trim_whitespace "${!key:-}")" ]]; then
    MISSING_CONFIG_KEYS+=("$key")
  fi
}

validate_config() {
  DO_HOST="$(trim_whitespace "${DO_HOST:-}")"
  DO_USER="$(trim_whitespace "${DO_USER:-}")"
  DO_REPO_DIR="$(trim_whitespace "${DO_REPO_DIR:-}")"
  DO_HOST_FINGERPRINT="$(trim_whitespace "$(printf '%s' "${DO_HOST_FINGERPRINT:-}" | tr -d '\r')")"

  MISSING_CONFIG_KEYS=()
  require_var "DO_HOST"
  require_var "DO_USER"
  require_var "DO_SSH_KEY"
  require_var "TRIGGER_SHA"

  if [[ "${#MISSING_CONFIG_KEYS[@]}" -gt 0 ]]; then
    fail "Missing required deploy configuration: ${MISSING_CONFIG_KEYS[*]}"
  fi

  if [[ -z "${DO_PORT:-}" ]]; then
    DO_PORT="22"
  fi
  DO_PORT="$(trim_whitespace "$DO_PORT")"

  if [[ ! "$DO_PORT" =~ ^[0-9]+$ ]]; then
    fail "DO_PORT must be numeric. Received: ${DO_PORT}"
  fi
  if (( DO_PORT < 1 || DO_PORT > 65535 )); then
    fail "DO_PORT must be between 1 and 65535. Received: ${DO_PORT}"
  fi

  if [[ ! "$TRIGGER_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
    fail "TRIGGER_SHA must be a 40-character git commit SHA."
  fi

  if [[ -n "$DO_HOST_FINGERPRINT" && ! "$DO_HOST_FINGERPRINT" =~ ^SHA256:[A-Za-z0-9+/=]+$ ]]; then
    fail "DO_HOST_FINGERPRINT must be a SHA256 fingerprint in the form SHA256:<base64>."
  fi

  if [[ -n "$DO_REPO_DIR" && "$DO_REPO_DIR" != /* ]]; then
    fail "DO_REPO_DIR must be an absolute path on the droplet. Received: ${DO_REPO_DIR}"
  fi
}

validate_key_file() {
  local key_file="$1"
  chmod 600 "$key_file"
  ssh-keygen -y -f "$key_file" >/dev/null 2>&1
}

prepare_ssh() {
  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"

  local key_file="$HOME/.ssh/deploy_key"
  printf '%s\n' "$DO_SSH_KEY" | tr -d '\r' >"$key_file"
  if ! validate_key_file "$key_file"; then
    printf '%b\n' "$DO_SSH_KEY" | tr -d '\r' >"$key_file"
  fi
  if ! validate_key_file "$key_file"; then
    printf '%s' "$DO_SSH_KEY" | tr -d '\r\n ' | base64 -d >"$key_file" 2>/dev/null || true
  fi
  if ! validate_key_file "$key_file"; then
    fail "DO_SSH_KEY is not a valid private key."
  fi

  local scanned_keys
  scanned_keys="$(ssh-keyscan -p "$DO_PORT" -H "$DO_HOST" 2>/dev/null || true)"
  if [[ -z "$scanned_keys" ]]; then
    fail "Unable to fetch SSH host keys for ${DO_HOST}:${DO_PORT}."
  fi

  local scanned_fingerprints
  scanned_fingerprints="$(printf '%s\n' "$scanned_keys" | ssh-keygen -lf - -E sha256 | awk '{print $2}' | sort -u)"

  if [[ -n "$DO_HOST_FINGERPRINT" ]]; then
    if ! printf '%s\n' "$scanned_fingerprints" | grep -Fxq "$DO_HOST_FINGERPRINT"; then
      {
        echo "Expected fingerprint: ${DO_HOST_FINGERPRINT}"
        echo "Scanned fingerprints:"
        printf '%s\n' "$scanned_fingerprints" | awk '{print "  - "$0}'
      } >&2
      fail "DO_HOST_FINGERPRINT does not match the scanned host key fingerprint(s)."
    fi
  else
    warn "DO_HOST_FINGERPRINT not provided; proceeding with ssh-keyscan known_hosts trust for this run."
  fi

  printf '%s\n' "$scanned_keys" >"$HOME/.ssh/known_hosts"
  chmod 600 "$HOME/.ssh/known_hosts"

  SSH_CMD=(
    ssh
    -i "$HOME/.ssh/deploy_key"
    -p "$DO_PORT"
    -o BatchMode=yes
    -o IdentitiesOnly=yes
    -o StrictHostKeyChecking=yes
    -o UserKnownHostsFile="$HOME/.ssh/known_hosts"
    -o ConnectTimeout=15
    "$DO_USER@$DO_HOST"
  )

  SCP_CMD=(
    scp
    -i "$HOME/.ssh/deploy_key"
    -P "$DO_PORT"
    -o BatchMode=yes
    -o IdentitiesOnly=yes
    -o StrictHostKeyChecking=yes
    -o UserKnownHostsFile="$HOME/.ssh/known_hosts"
    -o ConnectTimeout=15
  )
}

remote_run() {
  "${SSH_CMD[@]}" "$1"
}

resolve_remote_repo_dir() {
  if [[ -n "$DO_REPO_DIR" ]]; then
    return 0
  fi

  local repo_hint repo_name quoted_repo_name detected
  repo_hint="${GITHUB_REPOSITORY:-}"
  repo_name="${repo_hint##*/}"
  if [[ -z "$repo_name" || "$repo_name" == "$repo_hint" ]]; then
    repo_name="sarkariexam.me"
  fi
  quoted_repo_name="$(quote_for_remote_shell "$repo_name")"

  detected="$(remote_run "bash -se" <<EOF || true
set -Eeuo pipefail
repo_name=${quoted_repo_name}

candidates=(
  "\$HOME/\$repo_name"
  "\$HOME/sarkari-result-git-clean"
  "\$HOME/sarkariexam.me"
  "/opt/\$repo_name"
  "/opt/sarkari-result-git-clean"
  "/opt/sarkariexam.me"
  "/srv/\$repo_name"
  "/var/www/\$repo_name"
)

for path in "\${candidates[@]}"; do
  if [[ -d "\$path/.git" && -f "\$path/docker-compose.yml" && -f "\$path/scripts/deploy-live.sh" ]]; then
    echo "\$path"
    exit 0
  fi
done

exit 1
EOF
)"

  detected="$(printf '%s' "$detected" | tr -d '\r' | tail -n 1)"
  if [[ -z "$detected" ]]; then
    fail "DO_REPO_DIR is not set and auto-detection failed. Set DO_REPO_DIR as a repository variable or secret."
  fi

  DO_REPO_DIR="$detected"
  log "Auto-detected DO_REPO_DIR=${DO_REPO_DIR}"
}

upload_remote_helper() {
  if ! "${SCP_CMD[@]}" "scripts/deploy-live.sh" "${DO_USER}@${DO_HOST}:${REMOTE_HELPER_PATH}"; then
    fail "Failed to upload remote deploy helper."
  fi

  if ! remote_run "chmod 700 '$REMOTE_HELPER_PATH'"; then
    fail "Failed to set execute permission on remote deploy helper."
  fi
}

run_remote_helper() {
  local preflight_only="${1:-0}"
  local quoted_repo_dir quoted_project_name quoted_helper_path quoted_deploy_mode quoted_target_sha quoted_lock_wait

  quoted_repo_dir="$(quote_for_remote_shell "$DO_REPO_DIR")"
  quoted_project_name="$(quote_for_remote_shell "${COMPOSE_PROJECT_NAME:-sarkari-result}")"
  quoted_helper_path="$(quote_for_remote_shell "$REMOTE_HELPER_PATH")"
  quoted_deploy_mode="$(quote_for_remote_shell "${DEPLOY_MODE:-fast}")"
  quoted_target_sha="$(quote_for_remote_shell "$TRIGGER_SHA")"
  quoted_lock_wait="$(quote_for_remote_shell "${LOCK_WAIT_SECONDS:-}")"

  remote_run "bash -se" <<EOF
set -Eeuo pipefail
DO_REPO_DIR=${quoted_repo_dir}
COMPOSE_PROJECT_NAME=${quoted_project_name}
REMOTE_HELPER_PATH=${quoted_helper_path}
DEPLOY_MODE=${quoted_deploy_mode}
TRIGGER_SHA=${quoted_target_sha}
LOCK_WAIT_SECONDS=${quoted_lock_wait}
PRECHECK_ONLY=${preflight_only}

cmd=(bash "\${REMOTE_HELPER_PATH}" --mode "\${DEPLOY_MODE}" --sha "\${TRIGGER_SHA}")
if [[ "\${PRECHECK_ONLY}" == "1" ]]; then
  cmd+=(--preflight-only)
fi

DO_REPO_DIR="\${DO_REPO_DIR}" COMPOSE_PROJECT_NAME="\${COMPOSE_PROJECT_NAME}" LOCK_WAIT_SECONDS="\${LOCK_WAIT_SECONDS}" "\${cmd[@]}"
EOF
}

run_remote_preflight() {
  if ! run_remote_helper 1; then
    echo "Remote preflight failed. Recent remote log tail:" >&2
    remote_run "tail -n 120 '$REMOTE_LOG_FILE' || true" || true
    fail "Remote preflight failed. Check the remote prerequisite output above."
  fi
}

run_remote_deploy() {
  if ! run_remote_helper 0; then
    echo "Remote deploy failed. Recent remote log tail:" >&2
    remote_run "tail -n 200 '$REMOTE_LOG_FILE' || true" || true
    fail "Remote deploy failed. See ${REMOTE_LOG_FILE} on the droplet for the full log."
  fi
}

collect_remote_summary() {
  local remote_summary
  remote_summary="$(remote_run "tail -n 40 '$REMOTE_LOG_FILE' || true" || true)"

  append_summary_line "## Deploy Result"
  append_summary_line
  append_summary_line "- Branch: \`${TRIGGER_BRANCH}\`"
  append_summary_line "- Event: \`${TRIGGER_EVENT}\`"
  append_summary_line "- Conclusion: \`${TRIGGER_CONCLUSION}\`"
  append_summary_line "- Target SHA: \`${TRIGGER_SHA}\`"
  append_summary_line "- Repo path: \`${DO_REPO_DIR}\`"
  append_summary_line
  append_summary_line "### Remote Log Tail"
  append_summary_line
  append_summary_line '```text'
  if [[ -n "$remote_summary" && -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' "$remote_summary" >> "$GITHUB_STEP_SUMMARY"
  else
    append_summary_line "(no remote summary output captured)"
  fi
  append_summary_line '```'
}

set_stage "validate-config"
validate_config

set_stage "prepare-ssh"
prepare_ssh

set_stage "ssh-preflight"
if ! remote_run "echo 'SSH preflight connected'; whoami; hostname"; then
  fail "SSH preflight failed. Verify DO_HOST, DO_USER, DO_PORT, firewall rules, and deploy key validity."
fi

set_stage "resolve-repo-dir"
resolve_remote_repo_dir

set_stage "upload-helper"
upload_remote_helper

set_stage "remote-preflight"
run_remote_preflight

set_stage "remote-deploy"
run_remote_deploy

set_stage "remote-summary"
collect_remote_summary

log "Deployment completed successfully."
