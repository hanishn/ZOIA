param(
  [switch]$RunFullEvidence,
  [string]$SourceEvidenceRoot
)

$ErrorActionPreference = "Stop"
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $true
}

$DemoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = if ($SourceEvidenceRoot) { $SourceEvidenceRoot } else { Split-Path -Parent $DemoRoot }

function Copy-DemoFile {
  param(
    [string]$Source,
    [string]$Destination
  )

  $DestinationDirectory = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $DestinationDirectory)) {
    New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Copy-DemoDirectory {
  param(
    [string]$Source,
    [string]$Destination
  )

  $DestinationParent = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $DestinationParent)) {
    New-Item -ItemType Directory -Path $DestinationParent -Force | Out-Null
  }

  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

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
    npm run zoia:release:review-summary
    npm run zoia:verify:v04
    npm run zoia:generate:patch:claim-boundary
    npm run zoia:test:playwright:generated-patch-audio -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-audio/run-result.json
    npm run zoia:test:playwright:generated-patch-lfo-semantics -- --patch-root tests/workflow/generated-patches/manual-test-emulator --result-path tests/workflow/evidence/generated-patch-lfo-semantics/run-result.json
    npm run zoia:test:playwright:generated-patch-filter-semantics -- --patch-root tests/workflow/generated-patches/filter-test-emulator --result-path tests/workflow/evidence/generated-patch-filter-semantics/run-result.json

    Copy-DemoFile "$ProjectRoot\tests\workflow\generated-patches\manual-test-emulator\01-143816-v2.patch.json" "$DemoRoot\artifacts\generated-patches\manual-test-emulator\01-143816-v2.patch.json"
    Copy-DemoFile "$ProjectRoot\tests\workflow\generated-patches\manual-test-emulator\02-108214.patch.json" "$DemoRoot\artifacts\generated-patches\manual-test-emulator\02-108214.patch.json"
    Copy-DemoFile "$ProjectRoot\tests\workflow\generated-patches\manual-test-emulator\03-184325.patch.json" "$DemoRoot\artifacts\generated-patches\manual-test-emulator\03-184325.patch.json"

    Copy-DemoFile "$ProjectRoot\tests\workflow\evidence\generated-patch-final-evidence-inventory\run-result.json" "$DemoRoot\artifacts\generated-patch-final-evidence-inventory\run-result.json"
    Copy-DemoFile "$ProjectRoot\tests\workflow\evidence\generated-patch-final-evidence-inventory\claim-inventory.json" "$DemoRoot\artifacts\generated-patch-final-evidence-inventory\claim-inventory.json"
    Copy-DemoFile "$ProjectRoot\tests\workflow\evidence\generated-patch-final-evidence-inventory-negative-controls\run-result.json" "$DemoRoot\artifacts\generated-patch-final-evidence-inventory-negative-controls\run-result.json"
    Copy-DemoFile "$ProjectRoot\tests\workflow\evidence\release-review-summary\run-result.json" "$DemoRoot\artifacts\release-review-summary\run-result.json"
    Copy-DemoFile "$ProjectRoot\tests\workflow\evidence\v0.4-readiness\run-result.json" "$DemoRoot\artifacts\v0.4-readiness\run-result.json"
    Copy-DemoFile "$ProjectRoot\tests\workflow\evidence\generated-patch-claim-boundary\run-result.json" "$DemoRoot\artifacts\generated-patch-claim-boundary\run-result.json"

    Copy-DemoDirectory "$ProjectRoot\tests\workflow\evidence\generated-patch-audio" "$DemoRoot\artifacts\generated-patch-audio"
    Copy-DemoDirectory "$ProjectRoot\tests\workflow\evidence\generated-patch-lfo-semantics" "$DemoRoot\artifacts\generated-patch-lfo-semantics"
    Copy-DemoDirectory "$ProjectRoot\tests\workflow\evidence\generated-patch-filter-semantics" "$DemoRoot\artifacts\generated-patch-filter-runtime"
  }

  node "$DemoRoot\verify-demo.mjs"
} finally {
  $env:ZOIA_DEMO_SOURCE_ROOT = $PreviousSourceRoot
  $env:ZOIA_DEMO_RUN_FULL_EVIDENCE = $PreviousFullEvidenceRun
  Pop-Location
}
