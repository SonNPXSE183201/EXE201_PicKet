# Repository Guidelines

## Project Structure & Module Organization

Picket is a monorepo. `apps/mobile` is the Expo/React Native Android client; routes belong in `src/app`, feature UI and state in `src/features`, and shared code in `src/core`. `web/src` contains the Next.js client and admin portal. `apps/api` is the Dart Frog business API. Shared TypeScript contracts live in `packages/`; database migrations and policies live in `supabase/`. The static download site is `apps/landing`; deployment files are in `deploy/` and `compose.production.yml`. Mobile images are in `apps/mobile/assets`; documentation is in `docs/`. Read `.agents/rules/architecture.md` before changing boundaries between clients, API, and Supabase.

## Build, Test, and Development Commands

- `npm run test`, `npm run lint`, `npm run typecheck`: run checks from the root.
- `npm run test:mobile` or `npm run test:api`: run one area while iterating.
- `cd apps/mobile && npm run start`: start Expo; `cd web && npm run dev`: start Next.js; `cd apps/api && dart_frog dev`: start the API.
- `cd web && npm run build`: build the web app. `apps/landing` requires a verified signed APK in `PICKET_APK` before `npm run build`.
- `npm run cleanup:generated`: preview removable build output. Back up new APK/AAB files in `.artifacts/releases/`, then use `npm run cleanup:generated:apply` after builds finish.

## Coding Style & Naming Conventions

Follow nearby formatting: two-space indentation in TypeScript/JavaScript, `dart format` for Dart, descriptive English identifiers, and kebab-case source filenames. Keep routes thin and place reusable logic in `core` or shared packages. ESLint covers mobile and web; `dart analyze` covers the API. Do not add business rules directly to client-side Supabase calls.

## Testing Guidelines

Place mobile tests beside code as `*.test.ts`; web tests in `web/test/*.test.mjs`; Dart tests in `apps/api/test/*_test.dart`. Use focused tests, then run relevant lint, typecheck, and broader suites before a PR. CI checks formatting and builds. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Recent commits use scoped Conventional Commits, such as `fix(learning): ...` and `test(notifications): ...`; some test-first commits end in `(RED)` or `(GREEN)`. Keep commits focused. PRs should state the change, affected apps, test commands and results, release or migration impact, and linked issue when available; include screenshots for UI changes.

## Security & Agent Use

Use local `.env` files; never commit secrets, signing keys, APK/AAB backups, or generated caches. Preserve unrelated working-tree edits. Search and read narrowly; use an artifact directory when it helps preserve evidence, and summarize results instead of pasting full logs.

- There is no mandatory multi-agent workflow or required `PLAN.md` / `REPORT.md` / `REVIEW.md` sequence. Follow the task's scope and run focused checks appropriate to the change.
- Use [`.agents/skills/picket-ocr-testing/SKILL.md`](.agents/skills/picket-ocr-testing/SKILL.md) when evaluating receipt images, the `/Bill/` corpus, or OCR changes.
- For real-device Android QA, use only `com.picket.mobile.bugqa`; do not install over, clear, or remove the production package `com.picket.mobile` during QA.
