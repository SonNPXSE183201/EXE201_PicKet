# Picket Android launch page

Standalone, buildless HTML/CSS, compiled only to substitute verified release metadata and copy assets. No React/Next dependency, authentication, analytics, remote font requests, or runtime JavaScript. The existing `web/` application is unchanged by this launch page.

## Build and preview

Node 22.13+; no npm install is required in this directory.

```powershell
npm test --prefix apps/landing
$env:PICKET_APK = 'D:\EXE201\Project\.artifacts\ui-redesign\picket-production-arm64.apk'
npm run build --prefix apps/landing
python -m http.server 4175 --bind 127.0.0.1 --directory apps/landing/dist
```

Open `http://127.0.0.1:4175`. `dist/` and APKs are ignored; distribute signed APKs through the web server, not Git source history. A build rejects a missing APK, mismatched size/SHA-256, unsafe filename, emulator ABI, or QA package declared in the release manifest. The byte validator checks the manifest and hash; independently verify the real APK identity/signature/ABI before approving its hash. It does not parse Android binary manifests itself.

## Publish a new release

1. Build the current Expo source for `arm64-v8a` using production public configuration and the existing release signing key. Do not publish the x86_64 QA/emulator artifact.
2. Use Android `apksigner verify --print-certs` and `aapt2 dump badging`. Check production package, version, minSdk, ABI and non-debuggable build. Inspect the embedded bundle for production API and absence of QA loopback.
3. Update `release.json` with measured metadata and SHA-256. Include a hash fragment in the filename; never replace bytes at an immutable download URL. Release 1.0.1 uses Android versionCode 2; increment versionCode for every subsequent release rather than relying only on dates.
4. Rebuild and test. The site and checksum use this single manifest; do not edit download links manually. The QR opens the landing URL and is independent of the APK filename.
5. Upload `dist/` to `/opt/picket/apps/landing/dist`. Keep previous release content outside the served directory for rollback. Do not put private backups, signing files or env files under `dist/`.
6. Caddy mounts this directory read-only. Its matcher serves only `/`, `/launch-assets/*`, `/downloads/*`, `/release.json`. All other paths retain `reverse_proxy web:3000`, including `/login`, `/dashboard`, and `/auth/callback`.
7. Validate Caddy/Compose before applying. For the first directory mount, recreate **only Caddy** with `up -d --no-deps --no-build caddy`. Do not run the full Compose deployment or pull/rebuild web/API/OCR for a landing-only update.
8. Verify the live HTTPS page, full download hash, content type/disposition and byte-range response; check existing login/API. On later updates, upload a complete staged distribution then switch/copy into the served directory without removing still-advertised APKs.

Rollback: restore the saved Caddyfile and Compose file, recreate only Caddy; or restore a previous complete landing distribution with its matching manifest. No database migration is involved.

## Design and evidence

Reuse Picket colors: surface `#FFF8F0`, primary `#96606D`, primary container `#FFD6BA`, on-surface `#4A2C2A`, secondary text `#806268`. Material 3 semantic roles, filled/tonal actions, 48px primary touch targets, a hierarchy of radii, visible focus, native details/summary, reduced motion, and responsive reflow. This is a small site-specific mapping, not a claim of full Material component-library conformance.

Sans typography matches the native app. The actual app screenshot is from a disposable local guest profile with a 2,500,000 VND demonstration wallet; no real account or credentials are published. Logo is reused from `apps/mobile/assets/picket-logo.png`. QR generated with `qrcode` 1.5.4 (MIT), targeting the public landing URL; no QR package is shipped to visitors.

See [launch verification](../../docs/migration/LANDING_RELEASE_TDD.md). Design reference: [Material color roles](https://m3.material.io/styles/color/the-color-system) and [typography](https://m3.material.io/styles/typography/applying-type). Installation guidance: [Android alternative distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution); device policy and verification prompts may differ, so the page never recommends disabling Play Protect.
