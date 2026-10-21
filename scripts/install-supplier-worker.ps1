$ErrorActionPreference = 'Stop'
$supplierProject = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$supplierRunner = Join-Path $PSScriptRoot 'run-supplier-worker.ps1'
if (-not (Test-Path -LiteralPath $supplierRunner -PathType Leaf)) { throw 'Falta el procesador de proveedores.' }
$supplierNode = (Get-Command node -ErrorAction Stop).Source
$supplierBrowserInstaller = Join-Path $supplierProject 'node_modules\playwright\cli.js'
if (-not (Test-Path -LiteralPath $supplierBrowserInstaller -PathType Leaf)) { throw 'Instalar primero las dependencias de MYA con npm ci.' }
& $supplierNode $supplierBrowserInstaller install chromium --only-shell
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el navegador privado del seguimiento.' }
$supplierTaskName = 'MYA - Seguimiento de proveedores'
$supplierShell = (Get-Command pwsh.exe -ErrorAction SilentlyContinue).Source
if (-not $supplierShell) { $supplierShell = (Get-Command powershell.exe -ErrorAction Stop).Source }
$supplierAction = New-ScheduledTaskAction -Execute $supplierShell -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $supplierRunner + '"') -WorkingDirectory $supplierProject
$supplierTrigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(15)) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
$supplierPrincipal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$supplierSettings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $supplierTaskName -Action $supplierAction -Trigger $supplierTrigger -Principal $supplierPrincipal -Settings $supplierSettings -Description 'Lee catálogos públicos y fuentes verificadas de MYA; registra historial y aplica sólo cambios dentro de las reglas configuradas. Necesita sesión iniciada y conexión a internet.' -Force | Out-Null
Get-ScheduledTask -TaskName $supplierTaskName | Select-Object TaskName, State
Get-ScheduledTaskInfo -TaskName $supplierTaskName | Select-Object NextRunTime, LastTaskResult
