$ErrorActionPreference='Stop'
& dotnet build (Join-Path $PSScriptRoot 'Source/LabirentTd.Web.csproj') -c Debug -o (Join-Path $PSScriptRoot 'build/debug')
if($LASTEXITCODE -ne 0){throw 'Game build failed.'}
& (Join-Path $PSScriptRoot 'Build-BoardAssets.ps1')
Write-Output 'Debug binaries are in build/debug. Stop the server before copying them to the package root.'
