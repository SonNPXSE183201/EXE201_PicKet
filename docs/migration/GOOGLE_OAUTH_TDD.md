# Google OAuth web callback — TDD evidence (2026-10-15)

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Source: [FEATURE_PARITY.md](FEATURE_PARITY.md), Google OAuth P0. Journey: after
Google sign-in, a user returns only to an internal Picket route; an attacker
cannot turn the `next` parameter into an external redirect.

| Guarantee | Test | RED | GREEN |
| --- | --- | --- | --- |
| `/dashboard` and an internal route with query remain valid | `web/test/oauth-redirect.test.mjs` | Missing helper module | Pass |
| Absolute, protocol-relative, backslash, encoded-backslash and control-character destinations fall back to `/dashboard` | Same test | Missing helper module | Pass |

RED command: `node --experimental-strip-types --test web/test/oauth-redirect.test.mjs`
failed with `ERR_MODULE_NOT_FOUND` for the newly required helper. After
implementing the helper and using it in the Next.js callback, `npm run
test:auth --prefix web` passed 2/2. `npm run test:web`, `npm run build --prefix
web` (25 routes) and `git diff --check` also passed. No coverage percentage is
claimed: the project has no web coverage runner. No checkpoint commit was
created because this task did not authorize committing.

Limit: these tests do not prove a real Google provider session. Chrome's user
profile was not connected to the browser control surface in this session.
Later on 2026-10-15 the user reported a successful Chrome production login,
refresh, second-tab session restore and logout gate. This is user-reported
manual E2E, not an agent-observed browser trace. Production `/login` returned
HTTP 200 and Supabase authorize returned HTTP 302 to `accounts.google.com` in
read-only checks. The callback hardening in this repo has not been deployed.
