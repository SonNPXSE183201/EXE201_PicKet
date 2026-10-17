# Expo release toolchain follow-up — 2026-10-18

The landing release exposed existing Expo CI problems after the previously uncommitted snapshot was pushed. This follow-up changes release/dependency declarations, not mobile screens or business behavior.

## RED

- GitHub run `39079687269`: Expo/shared-contracts failed at npm ci. npm 10.9.2 locally reproduced a missing optional Worklets peer; npm 11.13.0 accepted the unchanged lock. Workflow pins npm 11.13.0 in the affected jobs.
- Run `39080527412`: npm install/shared-contracts/landing progressed successfully, but Expo Doctor failed. Local `npx expo-doctor` reported 19/21: missing direct `expo-font` dependency required by vector icons; expected Expo `~57.0.30` and router `~57.0.28`, installed `57.0.29`/`57.0.27`. Offline diagnostics still identified the missing direct font dependency (20/21), so this is not being suppressed by disabling checks.
- Plan: declare the existing font native module directly, apply the two recommended patch updates, run normal online Doctor and mobile gates, then produce/sign a versionCode-incremented ARM64 release before updating the public manifest. Do not claim the existing 1.0.0 APK contains future dependency updates.

GREEN, binary metadata and final CI outcome will be recorded after verification.
