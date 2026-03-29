#!/usr/bin/env bash

set -euo pipefail

DO_HOST="${DO_HOST:-64.227.191.101}"
DO_USER="${DO_USER:-root}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_ed25519}"
REMOTE_COMMAND='if [ -f ~/sarkari-result/scripts/deploy-live.sh ]; then bash ~/sarkari-result/scripts/deploy-live.sh; elif [ -f ~/sarkariexam.me/scripts/deploy-live.sh ]; then bash ~/sarkariexam.me/scripts/deploy-live.sh; else echo "No deployment entrypoint found"; exit 1; fi'

if [[ ! -f "$SSH_KEY_PATH" ]]; then
  echo "ERROR: SSH key not found at $SSH_KEY_PATH" >&2
  exit 1
fi

echo "Deploying to ${DO_USER}@${DO_HOST}"
echo "Remote command: ${REMOTE_COMMAND}"

ssh \
  -o BatchMode=yes \
  -o ConnectTimeout=20 \
  -o StrictHostKeyChecking=yes \
  -i "$SSH_KEY_PATH" \
  "${DO_USER}@${DO_HOST}" \
  "$REMOTE_COMMAND"
