#!/usr/bin/env bash

set -Eeuo pipefail

CURRENT_STAGE="init"
REMOTE_LOG_FILE="/tmp/sarkari-result-deploy.log"
REMOTE_HELPER_PATH="/tmp/sarkari-result-deploy-live-${GITHUB_RUN_ID:-$$}.sh"
SSH_CMD=()

log() {
  echo "[deploy-via-ssh] $*"
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

shell_escape() {
  printf '%q' "$1"
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
  "${SSH_CMD[@]}" "rm -f $(shell_escape "$REMOTE_HELPER_PATH")" >/dev/null 2>&1 || true
}

trap cleanup_remote_helper EXIT

require_var() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    MISSING_CONFIG_KEYS+=("$key")
  fi
}

validate_config() {
  MISSING_CONFIG_KEYS=()
  require_var "DO_HOST"
  require_var "DO_USER"
  require_var "DO_SSH_KEY"
  require_var "DO_HOST_FINGERPRINT"
  require_var "DO_REPO_DIR"
  require_var "TRIGGER_SHA"

  if [[ "${#MISSING_CONFIG_KEYS[@]}" -gt 0 ]]; then
    fail "Missing required deploy configuration: ${MISSING_CONFIG_KEYS[*]}"
  fi

  if [[ -z "${DO_PORT:-}" ]]; then
    DO_PORT="22"
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
  if ! printf '%s\n' "$scanned_fingerprints" | grep -Fxq "$DO_HOST_FINGERPRINT"; then
    {
      echo "Expected fingerprint: ${DO_HOST_FINGERPRINT}"
      echo "Scanned fingerprints:"
      printf '%s\n' "$scanned_fingerprints" | awk '{print "  - "$0}'
    } >&2
    fail "DO_HOST_FINGERPRINT does not match the scanned host key fingerprint(s)."
  fi

  printf '%s\n' "$scanned_keys" >"$HOME/.ssh/known_hosts"
  chmod 600 "$HOME/.ssh/known_hosts"

  SSH_CMD=(
    ssh
    -i "$HOME/.ssh/deploy_key"
    -p "$DO_PORT"
    -o BatchMode=yes
    -o StrictHostKeyChecking=yes
    -o ConnectTimeout=15
    "$DO_USER@$DO_HOST"
  )
}

remote_run() {
  "${SSH_CMD[@]}" "$1"
}

upload_remote_helper() {
  if ! remote_run "cat > $(shell_escape "$REMOTE_HELPER_PATH") && chmod 700 $(shell_escape "$REMOTE_HELPER_PATH")" < "scripts/deploy-live.sh"; then
    fail "Failed to upload remote deploy helper."
  fi
}

build_remote_helper_command() {
  local preflight_only="${1:-0}"
  local command_string

  command_string="DO_REPO_DIR=$(shell_escape "$DO_REPO_DIR") COMPOSE_PROJECT_NAME=$(shell_escape "${COMPOSE_PROJECT_NAME:-sarkari-result}") $(shell_escape "$REMOTE_HELPER_PATH") --mode $(shell_escape "${DEPLOY_MODE:-fast}") --sha $(shell_escape "$TRIGGER_SHA")"
  if [[ "$preflight_only" == "1" ]]; then
    command_string+=" --preflight-only"
  fi

  printf '%s' "$command_string"
}

run_remote_preflight() {
  local remote_command
  remote_command="$(build_remote_helper_command 1)"
  if ! remote_run "$remote_command"; then
    echo "Remote preflight failed. Recent remote log tail:" >&2
    remote_run "tail -n 120 $(shell_escape "$REMOTE_LOG_FILE") || true" || true
    fail "Remote preflight failed. Check the remote prerequisite output above."
  fi
}

run_remote_deploy() {
  local remote_command
  remote_command="$(build_remote_helper_command 0)"
  if ! remote_run "$remote_command"; then
    echo "Remote deploy failed. Recent remote log tail:" >&2
    remote_run "tail -n 200 $(shell_escape "$REMOTE_LOG_FILE") || true" || true
    fail "Remote deploy failed. See ${REMOTE_LOG_FILE} on the droplet for the full log."
  fi
}

collect_remote_summary() {
  local remote_summary
  remote_summary="$(remote_run "tail -n 40 $(shell_escape "$REMOTE_LOG_FILE") || true" || true)"

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
  fail "SSH preflight failed. Verify DO_HOST, DO_USER, DO_PORT, firewall rules, and the deploy key."
fi

set_stage "upload-helper"
upload_remote_helper

set_stage "remote-preflight"
run_remote_preflight

set_stage "remote-deploy"
run_remote_deploy

set_stage "remote-summary"
collect_remote_summary

log "Deployment completed successfully."
