# Google Play MCP check — 24 October 2026

<!-- project-status-link -->
> Đồng bộ tài liệu 01/11/2026: [Trạng thái hiện hành](PROJECT_STATUS.md) · [readback track mới nhất](migration/STORE_RELEASE_READBACK_20261101.md). Snapshot MCP dưới đây là dữ liệu lịch sử ngày 24/10.

Connected local Codex server `google-play` over stdio, using `play-store-mcp` source commit `a596ebfc691514f67292a17ad53f17e6648f9f92` from https://github.com/lusky3/play-store-mcp. Installed outside the repository under the user's `.codex/tools` directory with its dependency lockfile. Server runs with `--read-only` and `CODE_MODE=0`.

Authentication references the existing `Downloads/google-play-key.json` file by path; no private-key value was copied into the Codex configuration or repository. This connection does not configure Supabase secrets.

Verification used an actual MCP stdio client: initialization succeeded and exposed 117 tools. Read calls for `com.picket.mobile` returned:

| Area | Observed result |
| --- | --- |
| Subscriptions | Empty list: none returned by the API |
| Production track | No releases |
| Beta track | No releases |
| Alpha track | Draft release `Picket Testing`, version code 6 |
| Internal track | Completed release `7 (1.0.4)`, version code 7 |
| Store details | Title `PicKet`, default language `vi`; no short/full description or contact details returned |

Read operations that require the Android Publisher edits API create and discard a temporary edit; no edit was committed. No release, product, price, tester list, review reply, purchase or financial row was changed. No readiness claim is made for RTDN, subscription purchases or public production access.

The four product IDs used by the application remain to be configured and verified: `picket_plus_monthly`, `picket_plus_yearly`, `picket_pro_monthly`, `picket_pro_yearly`.
