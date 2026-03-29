[CmdletBinding()]
param(
  [string]$HostName = $(if ($env:DO_HOST) { $env:DO_HOST } else { '64.227.191.101' }),
  [string]$UserName = $(if ($env:DO_USER) { $env:DO_USER } else { 'root' }),
  [string]$KeyPath = $(if ($env:SSH_KEY_PATH) { $env:SSH_KEY_PATH } else { (Join-Path $HOME '.ssh\id_ed25519') })
)

$remoteCommand = "bash ~/sarkari-result/scripts/deploy-live.sh"

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
