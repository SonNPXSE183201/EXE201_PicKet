# Picket mobile

Flutter Android implementation based on Picket.MockUI. See `../docs/ANDROID_SETUP.md` for functionality, Supabase schema, Google Play configuration, signing and native verification.

```powershell
flutter pub get
flutter analyze --no-pub
flutter test --no-pub
```

No Android build or deployment has been performed. Production values belong in ignored `config/production.json`, copied from `config/production.example.json`. Release signing uses a private upload keystore configured in ignored `android/key.properties`.

Feature modules: finance, auth, capture, settings, billing, admin, partners. SQLite stores AES-GCM financial snapshots; Supabase synchronizes snapshots using optimistic concurrency and owner RLS. Private media is stored separately. See setup documentation for limits and conflict behavior.
