param(
    [ValidateSet('all', 'lint', 'unit')]
    [string]$Suite = 'all'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

node scripts/test.mjs $Suite
