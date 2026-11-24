$ErrorActionPreference='Stop'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Build-BoardAssets.ps1')
if($LASTEXITCODE -ne 0){throw 'Asset build failed.'}
$packagePath=Join-Path $PSScriptRoot '.packages'
& dotnet publish (Join-Path $PSScriptRoot 'Desktop/CrusaderDefender.Desktop.csproj') -c Release -r win-x64 --self-contained true "-p:RestorePackagesPath=$packagePath" -o (Join-Path $PSScriptRoot 'DesktopApp')
if($LASTEXITCODE -ne 0){throw 'Desktop publish failed.'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Game') -Destination (Join-Path $PSScriptRoot 'DesktopApp') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'wwwroot') -Destination (Join-Path $PSScriptRoot 'DesktopApp') -Recurse -Force
Write-Output 'Ready: DesktopApp/CrusaderDefender.exe'
