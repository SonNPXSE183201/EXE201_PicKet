param(
  [Parameter(Mandatory = $true)][string]$ApkPath,
  [string]$SshTarget = 'ubuntu@51.79.207.154',
  [string]$SshKey = "$env:USERPROFILE/.ssh/picket_ovh",
  [string]$ArtifactDirectory = '.artifacts/landing-deploy'
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path "$PSScriptRoot/../../..").Path
Push-Location $repoRoot
$previousApk = $env:PICKET_APK
try {
  $env:PICKET_APK = (Resolve-Path -LiteralPath $ApkPath).Path
  npm test --prefix apps/landing
  if ($LASTEXITCODE) { throw 'Landing tests failed' }
  npm run build --prefix apps/landing
  if ($LASTEXITCODE) { throw 'Landing build or APK verification failed' }
  New-Item -ItemType Directory -Force -Path $ArtifactDirectory | Out-Null
  $archivePath = Join-Path (Resolve-Path -LiteralPath $ArtifactDirectory).Path 'landing.tar.gz'
  $release = Get-Content -Raw apps/landing/dist/release.json | ConvertFrom-Json
  # Package explicit public files only, keeping previous APKs out of this archive.
  tar -czf $archivePath -C apps/landing/dist index.html privacy.html account-deletion.html release.json launch-assets "downloads/$($release.filename)" "downloads/$($release.filename).sha256"
  if ($LASTEXITCODE) { throw 'Packaging failed' }
  $remoteId = [guid]::NewGuid().ToString('N')
  $remoteArchive = "/tmp/picket-landing-$remoteId.tar.gz"
  $remoteScript = "/tmp/picket-landing-$remoteId.py"
  scp -i $SshKey $archivePath "${SshTarget}:$remoteArchive"
  if ($LASTEXITCODE) { throw 'Archive upload failed' }
  scp -i $SshKey deploy/deploy-landing.py "${SshTarget}:$remoteScript"
  if ($LASTEXITCODE) { throw 'Deploy script upload failed' }
  ssh -i $SshKey $SshTarget "python3 $remoteScript --archive $remoteArchive"
  if ($LASTEXITCODE) { throw 'Remote deployment failed; inspect rollback output' }
  Write-Host 'Landing deployed. Verify public HTTPS, APK hash and browser rendering before closing the release.'
} finally {
  $env:PICKET_APK = $previousApk
  Pop-Location
}
