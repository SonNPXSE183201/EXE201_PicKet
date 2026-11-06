# SMTP sender — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

Production authentication emails are sent by hosted Supabase Auth, not a separate VPS mail service.

- SMTP: `smtp.gmail.com:587`, STARTTLS.
- SMTP user and From address: `picketfinance@gmail.com`.
- Sender name: `Picket Production`.
- App password stored in Supabase SMTP settings only; not recorded in source or documentation.

Applied a sparse Supabase CLI configuration containing only SMTP properties. Readback diff confirms no declared non-secret SMTP differences; the password is masked by the Management API. The CLI left 22 unrelated remote properties unchanged, including OAuth, redirect URLs, confirmation policy and rate limits.

Verification: Gmail SMTP TLS authentication PASS. A disposable confirmed auth user with a unique Gmail alias requested password recovery through the production Auth endpoint. Recovery was accepted; the actual message was found in the recipient inbox and its From header verified as `"Picket Production" <picketfinance@gmail.com>`. Only headers were read, not the recovery token. The exact disposable auth user was deleted after the request. No existing user password or session was changed.

No VPS restart, application rebuild, database migration or mobile release required. Local evidence and non-secret configuration: `.artifacts/completion-20261027/smtp-change/`.
