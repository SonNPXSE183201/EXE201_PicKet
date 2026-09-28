# Picket API

Dart Frog REST façade for the Next.js and Expo clients. During migration it
keeps Supabase Auth, RLS, Storage, and the existing versioned finance snapshot.

## Local development

Set the variables shown in `.env.example`, then run:

```powershell
dart_frog dev
```

Endpoints:

- `GET /health`
- `GET /v1/finance/snapshot`
- `PUT /v1/finance/snapshot`

Finance endpoints require the user's Supabase access token. The API verifies the
token with Supabase Auth and forwards the same token to PostgREST, preserving the
existing owner RLS and optimistic-concurrency RPC.
