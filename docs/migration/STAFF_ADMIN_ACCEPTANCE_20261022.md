# Staff/admin acceptance — 22 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Scope and authorization

User authorized new test staff/admin accounts and testing without changing other accounts. Existing schema has **one staff role**, `public.staff_members` checked by `is_staff()`, not separate staff and super-admin permission tiers. No role redesign or permanent privileged account was introduced.

Created fresh synthetic staff and target accounts for each attempt. All user actions were allowlisted to those newly created IDs; no existing user's plan, password, session or finances were modified. Android used isolated `com.picket.mobile.qa` on `Picket_QA_35`, same source as the follow-up release except version/release configuration. API/RPC/Storage authorization used the actual deployed backend. Overview is an authorized metadata read; other users' ledger contents were not opened or exported into this report.

## Completed evidence

**18 functional checks PASS**, `.artifacts/roadmap-qa/staff-20261022-782288eb/result.json`:

| Check | Actual result |
| --- | --- |
| New staff membership | Only the fresh actor became staff; fresh target remained non-staff |
| Non-staff server access | Admin API overview and direct RPC denied |
| Self-promotion | Non-staff direct insert into staff table denied |
| Ledger authorization | Non-staff denied; staff read only the fresh target's ledger |
| Pagination | Page 0 contains new fixture; page 100000 returns empty users |
| Confirmation validation | Wrong confirmation/nonstaff grant rejected; target stays Free |
| Staff self-suspend | Rejected by actual API |
| Android nonstaff screen | Shows no admin permission |
| Android cancel | Cancel grant dialog: no mutation, target still Free |
| Android grant | Confirm Pro grant → actual server entitlement Pro |
| Android revoke | Confirm revoke → actual server entitlement Free |
| Android suspend | New target banned, server state checked |
| Android restore | New target restored, UI returns to suspend action |
| OCR/settings tabs | Actual tabs render; no global settings save |
| Inactive partner visibility | New inactive fixture hidden from nonstaff |
| Staff partner edit | Create/update inactive fixture through real RPC; remains inactive |
| Audit | New actor's audit contains grant/suspend/restore/overview/ledger/ad actions with only expected targets |
| Privilege revocation | Remove fresh staff membership, `is_staff=false`, admin API now denies the same actor |

Android native dialog uses uppercase labels. First harness failed to find `Hủy`; corrected matching uses the actual observed button case-insensitively, not changed app UI. Second harness wrongly expected HTTP 200 for a void RPC that correctly returns 204; corrected expectation accepts 204. Those failed runs are retained separately, not treated as complete acceptance.

## Cleanup and remaining inactive fixtures

Functional checks completed, but the first cleanup attempt failed because deployed `service_role` has no direct SELECT/DELETE privilege on `partner_ads`. This is **not** bypassed by widening table grants. Cleanup recovery independently removed the fresh actor's staff membership and both fresh Auth users, then verified **404** for both IDs:

- Actor `326c72a5-05ea-44ca-8796-37f2f674eb95`.
- Target `2fc245b2-ba7f-4d5a-ac66-35c7c0c6a2de`.
- Evidence `staff-20261022-782288eb/cleanup-result.json`, `staff-20261022-cleanup.log`.

The two prior attempt accounts were also removed by their `finally` cleanup. No temporary staff credentials were written to a report; no privileged test user remains.

**Two synthetic inactive partner rows remain**, visible only to staff, not to normal users:

1. Exact title `QA inactive bc87a254`, URL `https://example.com/picket-qa`, inactive. This came from the 204-expectation run; its random ID was not recorded before failure, so cleanup must use all exact identifying predicates and a count guard.
2. ID `911c6e3b-51b4-4a6c-8ca5-c332b1108c54`, exact title `QA updated 782288eb`, same URL, inactive.

An authorized SQL owner can remove exactly these synthetic rows using [scoped cleanup SQL](../../supabase/tests/cleanup_staff_qa_20261022.sql). It is not an app migration; it refuses active/ambiguous candidates. It has **not been executed** in this increment because current API credentials cannot delete that table and no direct owner SQL connection is available. No third-party partner ad was changed or deleted.

Local SQL validation PASS (`staff-cleanup-sql-validation.log`, PGlite): deletes only the two matching inactive fixtures, retains an unrelated active row, repeat is idempotent, active/renamed/duplicate candidates abort and preserve rows after rollback. This establishes local syntax/guard behavior, not production cleanup. Complete migration SQL functional suite also reran PASS in `release-1.0.4-sql-validation.log`. Browser inventory had no connected Supabase session, so no SQL Editor execution is claimed.

## Original checkpoint: not run under that authorization boundary

- **Real reset-email delivery**: needs a new test account with an inbox the owner controls; generated `example.com` fixtures cannot establish receipt/callback usability. No reset email was sent to an existing user.
- **Actual global maintenance/notice change**: deliberately not performed on shared production; would affect users beyond new test accounts. Settings tab/read was checked. Full mutation acceptance needs isolated staging or separately approved maintenance procedure; cancel/read is not counted as save acceptance.
- **Two distinct staff/admin tiers**: not implemented by current schema and not claimed. Creating a permanent administrative user requires an owner-controlled email and separate credential handoff, not a generated privileged login left behind after QA.

Result: core account/role/audit/admin actions above are verified against real services and Android; the three limitations and two-row SQL cleanup remain explicit. No backend permission broadening or other-account mutation was used to make the test pass.

## Follow-up after owner supplied an inbox — 22 October 2026

The previous section is historical, not the latest email status. Owner supplied their controlled Gmail inbox. Created a new plus-address alias target and fresh temporary staff, then called the actual deployed admin reset action. API returned 200; owner explicitly confirmed receiving the reset email in conversation. Evidence: `.artifacts/roadmap-qa/admin-inbox-9728be6a/result.json`. Staff role and staff account were removed; after receipt confirmation the exact alias target was also deleted and GET returned 404. Existing user's password, plan, sessions and finances were not changed. This verifies email delivery, not password submission or callback completion from that email. No privileged account or pending alias was left behind.

Settings DB follow-up: eight checks PASS on isolated PostgreSQL 16 using the actual administration migration: staff save/read, nonstaff denied, maintenance enforcement, staff writes, oversized notice rollback, resume writes, exact audit actor/count and restoration. Container had network none, no published ports or persistent data volumes, and was removed after the test. `.artifacts/roadmap-qa/admin-settings-isolated-postgres-result.json`. This is DB-only staging evidence, **not** Android/API/Supabase staging E2E; that remains open.

At that checkpoint, two inactive rows awaited SQL-owner cleanup and Edge was unavailable to the tool. Owner subsequently supplied a screenshot of successful execution of the scoped SQL. Independent SELECT with the newly authorized owner's staff account found zero rows matching the known fixture ID or legacy fixture title. Evidence: `.artifacts/roadmap-qa/owner-web-admin-20261022-result.json`, `cleanupIndependentlyVerified=true`. Agent did not execute a second DELETE or widen table privileges.

Owner explicitly requested a persistent, separate web-admin account and approved a Gmail plus-address alias. Created exactly that new Auth user and staff membership; API rejected admin access before grant (403) and accepted after grant (200), `is_staff=true`. Bootstrap refresh session was revoked after verification; no password/token was disclosed or saved. Unlike temporary QA users, this intended owner-admin account remains. Existing mobile-account permissions were not changed. Owner then confirmed successful password reset and actual `/admin` access in conversation on 22 October; this is owner-observed UI acceptance, not automated browser evidence or acceptance of every admin operation. [Instructions](../ADMIN_WEB_ACCESS.md). The role is account-wide, not web-only; no super-admin tier was invented. Staff remains able to use normal user features under the current additive-role model. No global maintenance changes or existing-user actions were executed during provisioning.

Current matrix and input requirements: [follow-up acceptance](BACKUP_ADMIN_EXTERNAL_ACCEPTANCE_20261022.md).
