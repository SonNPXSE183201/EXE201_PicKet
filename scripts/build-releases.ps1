$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releasesDir = Join-Path $repoRoot '.artifacts/releases'
New-Item -ItemType Directory -Force -Path $releasesDir | Out-Null

if (-not $env:JAVA_HOME) {
    $javac = Get-Command javac.exe -ErrorAction SilentlyContinue
    if (-not $javac) { throw 'Set JAVA_HOME to a JDK 17 installation before building releases.' }
    $env:JAVA_HOME = Split-Path -Parent (Split-Path -Parent $javac.Source)
}
if (-not (Test-Path (Join-Path $env:JAVA_HOME 'bin/jarsigner.exe'))) {
    throw "JAVA_HOME does not point to a JDK: $env:JAVA_HOME"
}
if (-not $env:ANDROID_HOME) {
    $defaultSdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
    if (Test-Path $defaultSdk) { $env:ANDROID_HOME = $defaultSdk }
}
if (-not $env:ANDROID_HOME -or -not (Test-Path (Join-Path $env:ANDROID_HOME 'build-tools/36.0.0/apksigner.bat'))) {
    throw 'Set ANDROID_HOME to an Android SDK with build-tools 36.0.0 installed.'
}
$env:NODE_ENV = 'production'
$env:CI = '1'

$mountedSubst = $false
$substDrive = $null
$buildRoot = $repoRoot
try {
    foreach ($letter in @('P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z')) {
        if (-not (Get-PSDrive -Name $letter -ErrorAction SilentlyContinue)) {
            Write-Host "Mapping subst drive ${letter}: to $repoRoot..."
            & subst "${letter}:" $repoRoot
            if ($LASTEXITCODE -eq 0) {
                $substDrive = "${letter}:"
                $buildRoot = $substDrive
                $mountedSubst = $true
                break
            }
        }
    }
    $mobileRoot = Join-Path $buildRoot 'apps/mobile'
    $androidRoot = Join-Path $mobileRoot 'android'

    Write-Host "Running release preflight..."
    Set-Location $mobileRoot
    & npm.cmd run release:preflight
    if ($LASTEXITCODE -ne 0) { throw "Release preflight failed with exit code $LASTEXITCODE" }

    $gradle = Join-Path $androidRoot 'gradlew.bat'
    $today = (Get-Date).ToString("yyyyMMdd")

    # --- PASS 1: Direct Release APK (for Landing Page and APKPure) ---
    Write-Host "`n=========================================="
    Write-Host "PASS 1: Direct Production APK (Landing & APKPure)"
    Write-Host "=========================================="
    $env:PICKET_PLAY_BUILD = '0'
    Set-Location 'P:/apps/mobile'
    Write-Host "Running expo prebuild for Direct APK..."
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw "Expo prebuild for Direct APK failed with exit code $LASTEXITCODE" }

    Set-Location $androidRoot
    Write-Host "Running Gradle assembleRelease..."
    & $gradle -p "$androidRoot" :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' -I "$(Join-Path $mobileRoot 'scripts/windows-release.init.gradle')" --no-daemon --max-workers=2 '-Pkotlin.compiler.execution.strategy=in-process' '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' --console=plain
    if ($LASTEXITCODE -ne 0) { throw "Gradle assembleRelease failed with exit code $LASTEXITCODE" }

    $rawApk = Join-Path $androidRoot 'app/build/outputs/apk/release/app-release.apk'
    if (-not (Test-Path $rawApk)) { throw "Expected APK output not found at $rawApk" }

    Write-Host "Verifying APK with apksigner..."
    $apksigner = "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat"
    & $apksigner verify --verbose --print-certs $rawApk
    if ($LASTEXITCODE -ne 0) { throw "apksigner verification failed" }

    $apkHash = (Get-FileHash -Algorithm SHA256 $rawApk).Hash.ToLower()
    $apkBytes = (Get-Item $rawApk).Length
    $shortSha = $apkHash.Substring(0, 8)

    $universalApkPath = Join-Path $releasesDir 'picket-1.0.14-28-production-universal.apk'
    $landingApkPath = Join-Path $releasesDir "picket-1.0.14-28-$today-$shortSha.apk"
    $apkpureApkPath = Join-Path $releasesDir "picket-1.0.14-28-apkpure-$today-universal.apk"

    Copy-Item -LiteralPath $rawApk -Destination $universalApkPath -Force
    Copy-Item -LiteralPath $rawApk -Destination $landingApkPath -Force
    Copy-Item -LiteralPath $rawApk -Destination $apkpureApkPath -Force

    $directManifest = Join-Path $androidRoot 'app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml'
    if (Test-Path $directManifest) {
        Copy-Item -LiteralPath $directManifest -Destination (Join-Path $releasesDir 'picket-1.0.14-28-direct-manifest.xml') -Force
    }

    Write-Host "Direct APK created: $universalApkPath"
    Write-Host "Landing APK: $landingApkPath"
    Write-Host "APKPure APK: $apkpureApkPath"
    Write-Host "Size: $apkBytes bytes, SHA256: $apkHash"

    # --- PASS 2: Google Play AAB ---
    Write-Host "`n=========================================="
    Write-Host "PASS 2: Google Play AAB (Android App Bundle)"
    Write-Host "=========================================="
    $env:PICKET_PLAY_BUILD = '1'
    Set-Location $mobileRoot
    Write-Host "Running expo prebuild for Google Play AAB..."
    & npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw "Expo prebuild for Play AAB failed with exit code $LASTEXITCODE" }

    Set-Location $androidRoot
    Write-Host "Running Gradle bundleRelease..."
    & $gradle -p "$androidRoot" :app:bundleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' -I "$(Join-Path $mobileRoot 'scripts/windows-release.init.gradle')" --no-daemon --max-workers=2 '-Pkotlin.compiler.execution.strategy=in-process' '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' --console=plain
    if ($LASTEXITCODE -ne 0) { throw "Gradle bundleRelease failed with exit code $LASTEXITCODE" }

    $rawAab = Join-Path $androidRoot 'app/build/outputs/bundle/release/app-release.aab'
    if (-not (Test-Path $rawAab)) { throw "Expected AAB output not found at $rawAab" }

    Write-Host "Verifying AAB with jarsigner..."
    $jarsigner = "$env:JAVA_HOME\bin\jarsigner.exe"
    & $jarsigner -verify -verbose -certs $rawAab
    if ($LASTEXITCODE -ne 0) { throw "jarsigner verification failed" }

    $aabHash = (Get-FileHash -Algorithm SHA256 $rawAab).Hash.ToLower()
    $aabBytes = (Get-Item $rawAab).Length

    $playAabPath = Join-Path $releasesDir 'picket-1.0.14-28-google-play.aab'
    Copy-Item -LiteralPath $rawAab -Destination $playAabPath -Force

    $playManifest = Join-Path $androidRoot 'app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml'
    if (Test-Path $playManifest) {
        Copy-Item -LiteralPath $playManifest -Destination (Join-Path $releasesDir 'picket-1.0.14-28-play-manifest.xml') -Force
    }

    Write-Host "Google Play AAB created: $playAabPath"
    Write-Host "Size: $aabBytes bytes, SHA256: $aabHash"

    # Save summary metadata
    $summary = [ordered]@{
        package = "com.picket.mobile"
        versionName = "1.0.14"
        versionCode = 28
        builtAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        abis = @("arm64-v8a", "x86_64")
        apk = [ordered]@{
            universal = "picket-1.0.14-28-production-universal.apk"
            landing = "picket-1.0.14-28-$today-$shortSha.apk"
            apkpure = "picket-1.0.14-28-apkpure-$today-universal.apk"
            bytes = $apkBytes
            sha256 = $apkHash
        }
        aab = [ordered]@{
            path = "picket-1.0.14-28-google-play.aab"
            bytes = $aabBytes
            sha256 = $aabHash
        }
    }
    $summary | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $releasesDir 'picket-1.0.14-28-build.json') -Encoding UTF8

    Write-Host "`nBUILD COMPLETED SUCCESSFULLY!"
}
finally {
    Set-Location $repoRoot
    if ($mountedSubst -and $substDrive) {
        Write-Host "Unmounting subst drive $substDrive..."
        & subst $substDrive /d
    }
}
