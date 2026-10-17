# Expo release toolchain follow-up — 2026-10-18

The landing release exposed existing Expo CI problems after the previously uncommitted snapshot was pushed. This follow-up changes release/dependency declarations, not mobile screens or business behavior.

## RED

- GitHub run `39079687269`: Expo/shared-contracts failed at npm ci. npm 10.9.2 locally reproduced a missing optional Worklets peer; npm 11.13.0 accepted the unchanged lock. Workflow pins npm 11.13.0 in the affected jobs.
- Run `39080527412`: npm install/shared-contracts/landing progressed successfully, but Expo Doctor failed. Local `npx expo-doctor` reported 19/21: missing direct `expo-font` dependency required by vector icons; expected Expo `~57.0.30` and router `~57.0.28`, installed `57.0.29`/`57.0.27`. Offline diagnostics still identified the missing direct font dependency (20/21), so this is not being suppressed by disabling checks.
- Plan: declare the existing font native module directly, apply the two recommended patch updates, run normal online Doctor and mobile gates, then produce/sign a versionCode-incremented ARM64 release before updating the public manifest. Do not claim the existing 1.0.0 APK contains future dependency updates.

## GREEN gates

- Applied recommended patch releases Expo 57.0.30/router 57.0.28 and declared expo-font ~57.0.4 directly. Dependency installation ran from `apps/mobile` with npm 11.13.0; lock changes were inspected. No screen/business logic changes.
- Normal **online** `npx expo-doctor`: **21/21 PASS**; no exclusions or disabled dependency checks. Mobile 152 tests PASS, typecheck PASS, lint 0 errors/24 existing warnings.
- Expo config now declares app version 1.0.1/Android versionCode 2; the generated Android build config matches. The native release must be signed and checked before the public manifest changes.
- `npm audit --omit=dev` still reports 30 affected dependency entries (12 moderate/18 high, 0 critical), originating in four advisories: braces, decode-uri-component, node-forge and uuid. This does not prove 30 independently exploitable APK flaws; some paths are build tooling. No forced/major dependency fixes were applied during this landing release. A separate reachability/dependency remediation review remains necessary; do not describe this MVP as security-audited.

Binary metadata and final CI outcome will be recorded after verification.

Fresh-install follow-up: after the patch updates, `npm ci --dry-run --ignore-scripts` exposed an optional `react-dom@19.3.1` peer selected during npm install, conflicting with the app's pinned React 19.2.3. This also stopped CI run `39080804103` at install. Pin react-dom to the SDK's 19.2.3 recommendation rather than using `--force`/`--legacy-peer-deps`. Do not mutate installed dependencies during an active native build; update the lock first and verify/rebuild after installation.
