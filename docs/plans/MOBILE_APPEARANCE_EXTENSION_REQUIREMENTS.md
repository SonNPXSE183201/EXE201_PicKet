# Appearance and language extensibility

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


User requirement added on 23 October 2026 during implementation.

- Separate appearance mode (`system`, `light`, `dark`) from color scheme ID.
- Register color schemes centrally; each scheme supplies the same semantic roles
  for light and dark. Screens consume roles, never individual scheme IDs or hex
  values. Adding a scheme must not require editing each screen.
- Register supported languages centrally with stable code, native display name,
  locale formatter mapping, direction and bundled resources. Generate language
  choices from the registry rather than a fixed vi/en list.
- Users choose registered schemes/languages. This requirement does not imply
  editing arbitrary individual colors, downloading unreviewed translations or
  automatically translating financial education with a provider.
- Validate complete token sets, readable contrast, dictionary keys/placeholders,
  plural behavior and locale formatting for each registered addition.
- Persist stable IDs in the versioned device settings record. Unknown or retired
  IDs use a documented fallback without deleting financial data or drafts.
- Adding RTL languages requires layout, navigation and native-direction QA;
  adding a dictionary alone does not establish RTL readiness.
- Preserve all existing device settings and account-locale compatibility during
  migration. Do not convert currency when selecting a language.

This requirement updates the remaining SET-04/05 implementation scope. Registry
work and migration are not claimed complete by this requirements document.
