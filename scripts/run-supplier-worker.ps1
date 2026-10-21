$ErrorActionPreference = 'Stop'
$supplierProject = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$supplierLogs = Join-Path $supplierProject 'scratch\suppliers-private'
New-Item -ItemType Directory -Path $supplierLogs -Force | Out-Null
[System.IO.File]::AppendAllText((Join-Path $supplierLogs 'launcher.log'), ((Get-Date -Format o) + ' launcher started' + [Environment]::NewLine))
$supplierNode = (Get-Command node -ErrorAction Stop).Source
[System.IO.File]::AppendAllText((Join-Path $supplierLogs 'launcher.log'), ((Get-Date -Format o) + ' node resolved' + [Environment]::NewLine))
$supplierScript = Join-Path $supplierProject 'scripts\supplier-worker-launcher.mjs'
if (-not (Test-Path -LiteralPath $supplierScript -PathType Leaf)) { throw 'Falta el lanzador del procesador.' }
# The scheduled PowerShell host is already hidden. A direct child remains in its task tree.
Set-Location -LiteralPath $supplierProject
& $supplierNode $supplierScript 1> (Join-Path $supplierLogs 'scheduled-worker.log') 2> (Join-Path $supplierLogs 'scheduled-worker-error.log')
$supplierExitCode = $LASTEXITCODE
[System.IO.File]::AppendAllText((Join-Path $supplierLogs 'launcher.log'), ((Get-Date -Format o) + ' worker exited ' + $supplierExitCode + [Environment]::NewLine))
exit $supplierExitCode
