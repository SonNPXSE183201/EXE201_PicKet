# Partner Notice effective periods — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Scope: preserve existing Free-only/HTTPS/current-owner behavior while giving notices explicit optional UTC effective bounds. `created_at` is ordering metadata, not an effective date. Start is inclusive; end is exclusive; null bounds preserve existing ads.

## Evidence

| Guarantee | Test and actual result |
| --- | --- |
| Future start hidden; exact start visible | Mobile policy RED then GREEN |
| Exact end hidden; missing end remains eligible | Mobile policy RED then GREEN |
| Malformed/reversed bounds fail closed | Mobile policy RED then GREEN |
| Expired newest ad does not mask another eligible candidate | Mobile policy RED then GREEN |
| Expired ad removed without losing general service notice; other owner gets nothing | Mobile policy RED then GREEN |
| Unknown/paid tiers and unsafe URLs remain ineligible | Existing partner tests retained GREEN |
| Database bounds/interval constraint exist | Explicit missing-column SQL RED, then full SQL suite GREEN |
| Non-staff sees only active current/legacy notices; staff sees scheduled/inactive rows | SQL fixture RLS PASS |
| Existing admin save RPC still creates unscheduled ads | SQL fixture PASS |

Commands actually run in `apps/mobile`: `node --import tsx --test src/features/partners/*.test.ts` — **9 PASS, 0 FAIL, 0 SKIP**; `npm run typecheck` PASS. Logs: `.artifacts/roadmap-qa/partner-period-red.log`, `partner-period-green.log`, `partner-period-typecheck.log`.

Database command: `node supabase/tests/validate.mjs`; RED missing-column assertion, then GREEN full SQL validation with migration `202610210002_partner_effective_period.sql`. Logs `partner-period-sql-red.log` / `partner-period-sql-green.log`. This suite uses PGlite; it is not an Android fixture or a deployed Supabase result.

Checkpoints: mobile RED `a72e1e2`, GREEN `9b21851`; SQL RED `9de5c3b`, GREEN `1b8bf8f`. Commit hooks ran lint/typecheck for the mobile changes.

## Integration

The focused component refreshes once per minute; a generation guard rejects earlier responses. A boundary timer hides the selected ad at its end. Querying all existing columns stays compatible with the schema before migration. A bounded candidate list replaces the previous single-candidate query. The owner render guard remains in place. No billing logic, payment flow or entitlement data is changed.

## Still required before acceptance

- Build/install the updated QA component and verify visible timer/Free/paid/unknown/owner-switch/link cases on Android with isolated fixtures.
- Migration `202610210002` was deployed to the linked project on 21 October after explicit user approval; remote migration history matches. Android fixture acceptance and deployed role/date behavior remain OPEN. Do not insert a globally visible production test ad to simulate an owner-private QA fixture.
- Scheduling input in staff UI is not added in this increment; staff access belongs to its separate acceptance scope. The existing staff save RPC remains compatible, and authorized SQL can set optional bounds after migration.
- Only the authorized Supabase schema migrations were deployed. No GitHub push or public APK replacement occurred.
