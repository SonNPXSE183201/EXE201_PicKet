# Admin Web and landing UI fixes — 2026-11-10

## Goal

Fix the reported local UI defects, align the Admin Web paper cards with the supplied Figma dashboard reference, and keep every change local for review before deployment.

## Design reference

- Figma file: `Picket--Copy-`, Admin Web page `146:5765`, overview frame `146:5767`.
- User reference: screenshot pair comparing the current dashboard paper cards with the intended compact Figma layout.
- Figma MCP is authenticated. The overview frame specifies a 544 px user card, 24 px hero/KPI gaps, 279 px paper height, 48/56 px hero typography, and 34/42 px KPI values.

## Work plan

1. **Shared paper UI** — remove the nested border around search text fields, correct paper card proportions and typography to match the Figma dashboard, and center the Security & MFA sidebar card.
2. **Admin navigation and lists** — order customer billing/revenue/payment links first and add direct page-number navigation to offset-paged lists.
3. **Payment and permissions** — add date/search filters for the loaded PayOS batch, open manual support grants in a popup, and edit permission groups in a bounded dialog. Full historical date/text search requires a server RPC update.
4. **Users and live updates** — show full UUIDs in a readable/copyable format, cap and visually contain account history, and pause automatic refresh while a user detail drawer is open so incoming logs do not keep moving the panel.
5. **Admin header** — use an avatar-only account control with the existing account details inside its dropdown; show system incidents in a notification menu and mark items read when opening them.
6. **Landing page** — remove store badges from the header, add clear hover/focus states to header links, and keep the ticket tear animation inside its card when Google Play is clicked.
7. **Review** — inspect the local diff. Keep the changes local; do not push or deploy.

## Progress

- [x] Inventory existing admin and landing components; preserve the existing Paper tokens and component system.
- [x] Match dashboard paper sizes, gaps, typography and art position to the inspected Figma frame; center Security & MFA and remove nested search borders.
- [x] Group customer navigation, add direct page jumps to offset-paged lists, show full user UUIDs, cap user history and defer realtime refresh while its drawer is open.
- [x] Add avatar-only profile, incident notification dropdown with local read state, and accessible dialogs for support grants and permission groups.
- [ ] Extend the payment RPC for historical date/text filters and direct page-number navigation. Current date/partial text filters operate on the active 50-order batch; UUID search is exact.
- [x] Fix landing header and ticket animation.
- [x] Review the local diff and whitespace. Keep deployment with the project owner.

## Environment note

The local Supabase CLI binary is blocked by Windows Application Control, and the npm launcher could not spawn it. The Supabase migration workflow requires creating migrations through that CLI, so no new database migration was fabricated. No deployment or test/build command was run.
