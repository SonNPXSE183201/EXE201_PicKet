# Picket API

Dart Frog REST façade for the Next.js and Expo clients. It keeps Supabase Auth,
RLS and Storage while the finance compatibility contract is persisted in the
15 normalized domain tables.

## Local development

Set the variables shown in `.env.example`, then run:

```powershell
dart_frog dev
```

Endpoints:

- `GET /health`
- `GET /v1/me`
- `POST /v1/onboarding`
- `PATCH /v1/profile`
- `PATCH /v1/preferences`
- `GET /v1/finance/snapshot`
- `PUT /v1/finance/snapshot`

Finance endpoints require the user's Supabase access token. The API verifies the
token with Supabase Auth and forwards the same token to PostgREST, preserving the
owner RLS. Onboarding creates profile, preferences and the first wallet in one
database transaction. The `/v1/finance/snapshot` URL remains a compatibility
contract, but its load/save RPCs read and write normalized tables.
