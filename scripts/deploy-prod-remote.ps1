[CmdletBinding()]
param(
  [string]$HostName = $(if ($env:DO_HOST) { $env:DO_HOST } else { '64.227.191.101' }),
  [string]$UserName = $(if ($env:DO_USER) { $env:DO_USER } else { 'root' }),
  [string]$KeyPath = $(if ($env:SSH_KEY_PATH) { $env:SSH_KEY_PATH } else { (Join-Path $HOME '.ssh\id_ed25519') }),
  [string]$DeployMode = "fast"  # Default to fast deployment mode
)

$remoteCommand = "export DEPLOY_MODE=$DeployMode && if [ -f ~/sarkari-result/scripts/deploy-live.sh ]; then bash ~/sarkari-result/scripts/deploy-live.sh; elif [ -f ~/sarkariexam.me/scripts/deploy-live.sh ]; then bash ~/sarkariexam.me/scripts/deploy-live.sh; else echo 'No deployment entrypoint found'; exit 1; fi"

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH key not found at $KeyPath"
}

Write-Host "Deploying to $UserName@$HostName"
Write-Host "Remote command: $remoteCommand"

& ssh `
  -o BatchMode=yes `
  -o ConnectTimeout=20 `
  -o StrictHostKeyChecking=yes `
  -i $KeyPath `
  "$UserName@$HostName" `
  $remoteCommand

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
