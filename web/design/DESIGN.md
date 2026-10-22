# Picket web workspace design

The brief fixes the visual direction: match the existing Expo app, without modifying mobile. This is an implementation of that identity, not a replacement brand. All runtime changes live under `web/`.

## Decisions

- Cream canvas, peach selection/balance surfaces, mauve actions and ink text come from mobile. Green/red convey money direction and always have supporting text or signs.
- Use the platform sans stack for Vietnamese text; avoid the old serif marketing treatment inside the application. Amounts use tabular numerals. Titles, section headings and captions have separate scales.
- Desktop has four primary destinations (overview, transactions, wallets, budgets); phone has the same four bottom tabs. The upper-right profile disclosure contains account utilities and logout, beside the notification bell. Admin retains six management destinations, including audit via its account menu on phone. Desktop tables become stacked records on phone.
- White 24 px surfaces group actual tasks. Pills are reserved for navigation and actions; inputs have 12 px corners. No decorative gradients, glass layers, scroll reveals or heavy shadows.
- Desktop controls use a compact 40 px baseline, with 44 px controls on phone; inputs on phone use 16 px text to avoid browser zoom. Keyboard focus, skip links, announced feedback and reduced motion are retained. Short viewports may scroll instead of clipping form content.
- Admin and user share visual tokens but not navigation or web mutation entry points. Supabase `is_staff` is checked on the server; an unavailable role lookup fails closed. This does not change Android roles or the Dart API.
- Native ML Kit, Android billing, alarms and biometrics are not simulated. Web has explicit cloud OCR consent, in-app reminders and a Play subscription-management link. Device-only Android queues are not exposed as an invented browser queue.

## Screen and state conventions

Forms retain visible labels. Destructive or global operations require typed confirmation. Optimistic versions are forwarded, never silently overwritten. Bulk results distinguish each success/failure. Reconciliation preserves a pending request ID and immutable body in owner-scoped browser storage; logout warns before deleting it. Loading, empty and API-error states explain the next action.

Private image URLs are short-lived. Backup encryption/decryption uses Web Crypto locally with the existing cloud `.picket` contract (PBKDF2-SHA256 210,000; AES-256-GCM). Passwords are not sent to the API.

## Preview and verification

Open [design-preview.html](design-preview.html) for a self-contained token preview with user/admin and narrow/wide controls. It contains explicitly illustrative values, not production data. Runtime CSS is [workspace.css](../src/app/workspace.css) with final web density in [compact.css](../src/app/compact.css); the JSON inventory is [design-tokens.json](design-tokens.json). Selects progressively enhance to branded native pickers where base-select is supported; other browsers retain the accessible OS picker.

Real Next.js pages were exercised at 390, 768 and 1440 px using generated QA accounts. One tablet overflow in duplicate-receipt filters was found and fixed. Screenshots were visually inspected. Full acceptance evidence and remaining limits are tracked in the web redesign report; a screenshot pass is not proof of every mutation or native capability.

## Design audit (subjective, not automated certification)

| Dimension         | Review                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Color consistency | 9/10 — mobile palette reused; stronger input outline for contrast                           |
| Typography        | 8/10 — task hierarchy and tabular money; platform font rendering varies                     |
| Spacing           | 8/10 — 6/10/16/20/24/32 rhythm, compact mobile forms                                        |
| Components        | 8/10 — shared workspace, feedback and form patterns                                         |
| Responsive        | 8/10 — route sweep at three widths; long-content and 200% checks remain separate            |
| Dark mode         | Not introduced; existing fixed light mobile identity preserved                              |
| Animation         | 9/10 — only interaction feedback, reduced-motion support                                    |
| Accessibility     | 8/10 — native controls, semantic links, labels and focus; not a formal assistive-tech audit |
| Density           | 8/10 — overview summaries separated from full management lists                              |
| States/polish     | 8/10 — loading/errors/empty/success designed; external-service failures still require QA    |
