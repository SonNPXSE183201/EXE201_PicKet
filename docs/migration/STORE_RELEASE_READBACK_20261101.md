# Picket store and release readback — 1 November 2026

Read-only status captured on 1 November 2026. This report separates live platform state from local build artifacts. Older dated release reports remain historical evidence.

## Google Play

Package: `com.picket.mobile`; source version: `1.0.14` / version code `28`.

Google Play Android Publisher API readback:

| Track | Version | Status | Rollout |
| --- | --- | --- | ---: |
| Internal testing | 1.0.14 / 28 | `completed` | 100% |
| Closed testing (`alpha`) | 1.0.14 (28) - Paper UI | `completed` | 100% |
| Open testing (`beta`) | No release | — | — |
| Production | No release | — | — |

The alpha tester configuration contains one Google Group. The readback does not reveal that group's member count, individual opt-ins, or continuous participation days. It does not establish whether a required tester cohort has met a 14-day condition. Internal testing has no Google Group configured in the track readback.

The current Play AAB is 118,288,427 bytes with SHA-256 `a610c7b740e8e5b4bd3f1f46de53490a0b8061ceb13d493dbd16137c971ff59c`. The upload/commit and track readbacks are preserved in [the build and submission metadata](../../.artifacts/releases/picket-1.0.14-28-play-submission.json) and [the closed-track verification](../../.artifacts/releases/picket-1.0.14-28-closed-testing-20261101.json).

The most recent store-listing readback recorded in the repository is 31 October: seven phone screenshots per VI and EN-US locale, plus descriptions and graphics. The English screenshot images still contain Vietnamese app UI text, and Console review/approval status was not verified. See [the 31 October listing report](PLAY_INTERNAL_STORE_20261031.md).

## Public landing download

`https://picketfinance.com/release.json` returned HTTP 200 and reports version `1.0.14`, code `28`, package `com.picket.mobile`, ARM64, 161,644,903 bytes and SHA-256 `1713c3dfbbe220720e5a355442d0de8b4d5cc27b7c89840c1b1f0a2a0120b17b`. A HEAD request to the APK download returned HTTP 200 with the matching content length. The local signed artifact and its build record are [here](../../.artifacts/releases/picket-1.0.14-28-20261101-1713c3df.apk) and [here](../../.artifacts/releases/picket-1.0.14-28-build.json).

## APKPure

The APKPure build record declares a signed universal ARM64 + x86_64 APK, 161,644,903 bytes, SHA-256 `1713c3dfbbe220720e5a355442d0de8b4d5cc27b7c89840c1b1f0a2a0120b17b`. The store-specific filename in that record is not retained in `.artifacts/releases`; the same signed bytes/hash are retained as the canonical [1.0.14/code 28 APK](../../.artifacts/releases/picket-1.0.14-28-20261101-1713c3df.apk). Seven current Paper UI screenshots and release notes are prepared in [the APKPure artifact folder](../../.artifacts/apkpure-store-20261101/BUILD-AND-LISTING.txt).

No APKPure portal/API readback was available for this check. Submission, review, approval, and publication status are therefore **unverified**; the 28 October status must not be treated as the current status.

## Web production

Web release `web-20261101-responsive-839e5cb-01` is deployed. The deployment changed the web container only; API, database, OCR and Caddy were not redeployed. Signed-in user/admin UI checks used real sessions and live API data in read-only mode; the public landing budget simulator is an approved illustrative demo. The admin write flows requiring MFA were not exercised. Full evidence and limits are in the [1 November production report](../../.artifacts/picket-web-prod-20261101/DEPLOYMENT.md).
