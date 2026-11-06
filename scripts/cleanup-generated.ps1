param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$repoPrefix = $repoRoot + [System.IO.Path]::DirectorySeparatorChar

function Resolve-RepoPath([string]$relative) {
    $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($repoRoot, $relative))
    if (-not $full.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing path outside repository: $relative"
    }
    return $full
}

$relativeTargets = [System.Collections.Generic.List[string]]::new()
$artifactRoot = Resolve-RepoPath '.artifacts'
if (Test-Path -LiteralPath $artifactRoot -PathType Container) {
    Get-ChildItem -LiteralPath $artifactRoot -Directory -Filter '*export*' |
        Where-Object {
            (($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -eq 0) -and
            (Test-Path -LiteralPath (Join-Path $_.FullName 'metadata.json') -PathType Leaf) -and
            (Test-Path -LiteralPath (Join-Path $_.FullName '_expo') -PathType Container)
        } |
        ForEach-Object { $relativeTargets.Add([System.IO.Path]::GetRelativePath($repoRoot, $_.FullName)) }
}
$moduleRoot = Resolve-RepoPath 'apps/mobile/node_modules'
if (Test-Path -LiteralPath $moduleRoot -PathType Container) {
    Get-ChildItem -LiteralPath $moduleRoot -Directory -Recurse -Filter android -ErrorAction Stop |
        Where-Object { ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -eq 0 } |
        ForEach-Object {
            foreach ($name in @('build', '.cxx')) {
                $generated = Join-Path $_.FullName $name
                if (Test-Path -LiteralPath $generated -PathType Container) {
                    $relativeTargets.Add([System.IO.Path]::GetRelativePath($repoRoot, $generated))
                }
            }
        }
}
foreach ($relative in @(
    'apps/mobile/android/app/build',
    'apps/mobile/android/app/.cxx',
    'apps/mobile/android/build',
    'apps/mobile/android/.gradle',
    'apps/mobile/android/.kotlin',
    'apps/mobile/dist',
    'apps/api/build',
    'web/.next',
    'web/.next-dev',
    'apps/landing/dist',
    '.artifacts/roadmap-qa/cache-size-audit'
)) {
    if (Test-Path -LiteralPath (Resolve-RepoPath $relative) -PathType Container) {
        $relativeTargets.Add($relative)
    }
}

$targets = foreach ($relative in $relativeTargets) {
    $full = Resolve-RepoPath $relative
    $item = Get-Item -LiteralPath $full -Force
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Refusing reparse point: $relative"
    }
    $gitPath = $relative.Replace('\', '/')
    $tracked = @(git -C $repoRoot ls-files -- $gitPath)
    if ($tracked.Count -gt 0) { throw "Refusing directory with tracked files: $relative" }
    git -C $repoRoot check-ignore -- $gitPath *> $null
    if ($LASTEXITCODE -ne 0) { throw "Refusing directory not ignored by Git: $relative" }
    [pscustomobject]@{ Relative = $relative; Full = $full }
}

$backupHashes = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$backupDir = Resolve-RepoPath '.artifacts/releases'
if (Test-Path -LiteralPath $backupDir -PathType Container) {
    Get-ChildItem -LiteralPath $backupDir -File |
        Where-Object { $_.Extension -in @('.apk', '.aab') } |
        ForEach-Object { [void]$backupHashes.Add((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash) }
}

$totalBytes = [long]0
$packageCount = 0
foreach ($target in $targets) {
    Get-ChildItem -LiteralPath $target.Full -File -Recurse -Force | ForEach-Object {
        if (($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing linked file: $($_.FullName)"
        }
        $totalBytes += $_.Length
        if ($_.Extension -in @('.apk', '.aab')) {
            $packageCount++
            $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            if (-not $backupHashes.Contains($hash)) {
                throw "Back up this APK/AAB in .artifacts/releases before cleanup: $($_.FullName)"
            }
        }
    }
}

$gib = [math]::Round($totalBytes / 1GB, 2)
Write-Output "$($targets.Count) generated directories; $gib GiB; $packageCount APK/AAB already backed up."
if (-not $Apply) {
    Write-Output 'Dry run only. Use npm run cleanup:generated:apply to remove these directories.'
    return
}
foreach ($target in $targets) {
    Remove-Item -LiteralPath $target.Full -Recurse -Force
}
Write-Output "Removed $($targets.Count) generated directories. Release backups remain in .artifacts/releases."
