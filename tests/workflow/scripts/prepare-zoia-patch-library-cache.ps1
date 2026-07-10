param(
  [string]$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$ZipPath = (Join-Path $RepoRoot ".ZoiaLibraryApp_2_8_2026.zip"),
  [string]$CacheRoot = (Join-Path $RepoRoot "tests\workflow\patch-library-cache\ZoiaLibraryApp_2_8_2026"),
  [string]$ManifestPath = (Join-Path $RepoRoot "tests\workflow\patch-library-cache\zoia-patch-library-manifest.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ZipPath)) {
  throw "Patch library zip not found: $ZipPath"
}

New-Item -ItemType Directory -Force -Path $CacheRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ManifestPath) | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-Sha256Hex {
  param([string]$Path)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $hash = $sha.ComputeHash($stream)
    return ([System.BitConverter]::ToString($hash) -replace "-", "").ToLowerInvariant()
  } finally {
    $stream.Dispose()
    $sha.Dispose()
  }
}

$zipItem = Get-Item -LiteralPath $ZipPath
$zipHash = Get-Sha256Hex -Path $ZipPath

$archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  $entries = @($archive.Entries | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Name) })
  $binEntries = @($entries | Where-Object { $_.FullName -like "*.bin" })
  $jsonEntries = @($entries | Where-Object { $_.FullName -like "*.json" })

  foreach ($entry in $entries) {
    $relative = $entry.FullName -replace '^\.ZoiaLibraryApp/', ''
    if ([string]::IsNullOrWhiteSpace($relative)) { continue }
    $dest = Join-Path $CacheRoot $relative
    $destDir = Split-Path -Parent $dest
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
  }
} finally {
  $archive.Dispose()
}

$binFiles = @(Get-ChildItem -LiteralPath $CacheRoot -Recurse -File -Filter *.bin | Sort-Object FullName)
$patches = foreach ($bin in $binFiles) {
  $id = [System.IO.Path]::GetFileNameWithoutExtension($bin.FullName)
  $meta = Join-Path $bin.DirectoryName "$id.json"
  [pscustomobject]@{
    source = "patch-library"
    patchId = $id
    category = "patch-library"
    binPath = $bin.FullName
    metadataPath = if (Test-Path -LiteralPath $meta) { $meta } else { $null }
    binSize = $bin.Length
    binSha256 = Get-Sha256Hex -Path $bin.FullName
    readOnlySource = $true
  }
}

$manifest = [ordered]@{
  schemaVersion = "zoia.patch-library-manifest.v0"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  zipPath = $zipItem.FullName
  zipSha256 = $zipHash
  zipBytes = $zipItem.Length
  cacheRoot = (Get-Item -LiteralPath $CacheRoot).FullName
  totalEntries = $entries.Count
  binEntryCount = $binEntries.Count
  jsonEntryCount = $jsonEntries.Count
  patchCount = $patches.Count
  patches = @($patches)
}

$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

[pscustomobject]@{
  status = "prepared"
  zipPath = $zipItem.FullName
  cacheRoot = (Get-Item -LiteralPath $CacheRoot).FullName
  manifestPath = (Get-Item -LiteralPath $ManifestPath).FullName
  patchCount = $patches.Count
  binEntryCount = $binEntries.Count
  jsonEntryCount = $jsonEntries.Count
} | ConvertTo-Json -Depth 4
