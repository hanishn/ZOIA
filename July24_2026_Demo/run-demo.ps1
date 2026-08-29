param(
  [switch]$RunFullEvidence,
  [string]$SourceEvidenceRoot
)

$ErrorActionPreference = "Stop"
$DemoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = if ($SourceEvidenceRoot) { $SourceEvidenceRoot } else { Split-Path -Parent $DemoRoot }

Push-Location $ProjectRoot
try {
  $PreviousSourceRoot = $env:ZOIA_DEMO_SOURCE_ROOT
  $PreviousFullEvidenceRun = $env:ZOIA_DEMO_RUN_FULL_EVIDENCE
  $env:ZOIA_DEMO_SOURCE_ROOT = $ProjectRoot

  if ($RunFullEvidence) {
    $env:ZOIA_DEMO_RUN_FULL_EVIDENCE = "1"
    npm run zoia:generate:patch:text-prompt-runtime-rollup
    npm run zoia:generate:patch:final-evidence-inventory
    npm run zoia:generate:patch:final-evidence-inventory:negative-controls
    Copy-Item -LiteralPath "$ProjectRoot\tests\workflow\evidence\generated-patch-final-evidence-inventory\run-result.json" -Destination "$DemoRoot\artifacts\generated-patch-final-evidence-inventory\run-result.json" -Force
    Copy-Item -LiteralPath "$ProjectRoot\tests\workflow\evidence\generated-patch-final-evidence-inventory\claim-inventory.json" -Destination "$DemoRoot\artifacts\generated-patch-final-evidence-inventory\claim-inventory.json" -Force
    Copy-Item -LiteralPath "$ProjectRoot\tests\workflow\evidence\generated-patch-final-evidence-inventory-negative-controls\run-result.json" -Destination "$DemoRoot\artifacts\generated-patch-final-evidence-inventory-negative-controls\run-result.json" -Force
  }

  node "$DemoRoot\verify-demo.mjs"
} finally {
  $env:ZOIA_DEMO_SOURCE_ROOT = $PreviousSourceRoot
  $env:ZOIA_DEMO_RUN_FULL_EVIDENCE = $PreviousFullEvidenceRun
  Pop-Location
}
