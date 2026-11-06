# Custom domain deployment — 26 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Live routing

| Host | Service |
| --- | --- |
| `https://picketfinance.com` | Existing static landing, APK downloads, release metadata and legal pages |
| `https://app.picketfinance.com` | Existing Next.js web application |
| `https://api.picketfinance.com` | Existing Dart API |

All three A records resolve to `51.79.207.154`. Caddy manages trusted HTTPS and
renewal. Cloudflare remains DNS-only; no account settings were changed. If proxying
is enabled later, use Full (strict) with the valid origin certificate.

The old `picket.51-79-207-154.sslip.io` and `api.51-79-207-154.sslip.io` remain
served, including immutable APK URLs and existing legal links. Landing web routes
such as `/login` redirect to the new app hostname. No user data was migrated.

## Changes

- Add separate landing and legacy host variables to Compose/Caddy. Keep the live
  landing artwork and release 17 unchanged.
- Build `picket-web:domain-20261026` from the previously deployed web source with
  `NEXT_PUBLIC_API_URL=https://api.picketfinance.com`; set runtime `APP_BASE_URL`
  through the new web domain. Recreate only Caddy, web and API. OCR services remain
  running. Do not deploy unrelated local web/UI changes.
- Add the new web origin to API CORS while retaining the old origin. Foreign
  origins remain rejected; protected endpoints still require authentication.
- Update Supabase Site URL and exact web callback URLs, retaining mobile deep
  links and the prior callback. Apply a sparse CLI configuration: all undeclared
  authentication, MFA, SMTP, database and storage settings remain unchanged.
- Update the local mobile API environment and production example for future
  builds. Existing signed APK/AAB 17 binaries are unchanged and continue using
  their working legacy endpoints/update origin. A domain change does not require
  users to reinstall or clear app data.

## Verification

- Production web build PASS. Caddy validation and Compose configuration PASS.
- New and legacy production smoke PASS: web 200, API health `ok`, protected route
  401, allowed CORS preflight and TLS security headers.
- Trusted TLS verified for all new hosts. Landing, privacy, deletion and release
  metadata return 200. Full APK download matches release 17's SHA-256 and byte
  length; range requests return 206.
- Browser screenshots inspected for landing and login. Browser-origin API health
  fetch succeeds. Login redirects from the landing to the app hostname; invalid
  OAuth callback stays on the app hostname. No complete account sign-in was
  performed in this deployment check.
- Supabase config diff confirms no remaining declared URL changes. Landing tests
  pass (10). Web auth/unit checks pass (54).

Evidence: `.artifacts/domain-migration/`, especially `live-verification.json`,
`build.log`, `deploy.log`, `auth-final-diff.log` and browser screenshots.

## Rollback

Server backup: `/opt/picket/deploy/backups/domain-20261026/`. It contains the prior
`Caddyfile`, Compose file and private environment file (mode 0600). Restore their
contents to the corresponding original paths, then run from `/opt/picket`:

```sh
docker compose --env-file deploy/.env.production -f compose.production.yml up -d --no-deps --no-build api web caddy
```

The old web image remains available. For Supabase, restore only `site_url` and
`additional_redirect_urls` from the private task backup through a sparse config;
never push the full pulled config merely to roll back URLs. Repeat HTTPS, API,
CORS and download checks after rollback. Preserve release backups and existing
download URLs.
