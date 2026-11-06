# Android network-pool recovery — 2026-10-21

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Reproducer and cause evidence

Generated QA owners A/B on Android 35 only. Full sequence: authenticate A, cache own photo, go offline, ban A on the real auth server, create an offline transaction, restart, reconnect to server 401, log out offline, reconnect, immediately authenticate B, restart B offline, log out and return to unbanned A. No real-account password, finance or session changes.

Before the fix, one clean-APK run passed, then repetition failed at B. Do not erase that flakiness from the acceptance record. QA-only native event listeners narrowed the failure:

- Default-network availability/validation changed after offline logout.
- B's call at `01:12:05.968` acquired an existing connection with local address `10.0.2.15`, without a new DNS/TLS phase, and sent request headers/body.
- It failed at the ten-second auth deadline.
- A fresh isolated, unauthenticated GET to the same server returned HTTP 401 roughly 962 ms later. This is successful HTTPS reachability, not successful authentication.
- Artifact: `.artifacts/roadmap-qa/auth-native-phase-before-guard.log`. Probe contains phase timestamps, status and local socket address only, no URLs, headers, body, passwords or tokens. Probe class/provider is outside application source and absent from the final persisted-guard APK.

This supports stalled pooled connections after network changes. Ping alone, an Android `VALIDATED` string, or host-side login success would not establish this cause.

Installed RN/Expo source shows both networking clients come from `OkHttpClientProvider.createClient(context)`. Expo has its own private client, so evicting the provider's unrelated singleton would not fix that pool. [OkHttp's pool eviction removes only idle connections](https://raw.githubusercontent.com/square/okhttp/parent-4.9.2/okhttp/src/main/kotlin/okhttp3/ConnectionPool.kt); active calls must not be cancelled or replayed as a shortcut.

## Persisted fix

- `with-network-pool-guard.js` generates a Kotlin guard and installs it immediately after Application `super.onCreate`, before React Native creates its clients. Expo prebuild generated and compiled this integration.
- The factory starts from the standard RN context builder, preserving cookies/cache/proxy/TLS and standard timeout defaults. No hardcoded IP, certificate bypass, global process binding, auth replay, session wipe or dispatcher shutdown.
- Track the actual client pools weakly. Default-network loss/change/first validation sweeps idle connections. Duplicate availability/validation callbacks are ignored for the same generation.
- Track the generation of acquired connections weakly. A connection active during a change is swept when released, once idle, so it cannot remain in the pool indefinitely merely because the original transition occurred during an active request.
- One application-process installation and callback; no Activity references. Android registration failure falls back to ordinary networking and emits a generic native warning, never a user-facing development diagnostic.
- This application owns the custom factory. There were no other setters in the inspected app/plugins/modules; future integrations must coordinate this ownership, because RN exposes no public factory getter for safe chaining.

## Executed verification

| Case | Result / evidence |
| --- | --- |
| Missing persistent prebuild integration | RED 0/1, checkpoint `9b4476f` |
| Idempotent hook injection, before React initialization, reject misplaced hook, preserve network safety contracts | GREEN 3/3 |
| Expo prebuild with no package installation | PASS; generated `PicketNetworkGuard.install(this)` before `loadReactNative`; package scripts/dependency files unchanged |
| Persisted guard Kotlin x86_64 release build | PASS, 3m40s; no diagnostic provider/source included |
| Isolated experimental idle sweep | B login passed; entire run INVALIDATED by an ADB UI-dump/pull failure during subsequent B logout, not counted as full PASS |
| Full real-ban/offline A–B–A on persisted-guard APK | PASS twice, `auth-network-guard-full1.log`, `auth-network-guard-full2.log` and `revoked-account-isolation-native-results.json`; each exact one queued transaction and A photo restored, B unchanged |
| Three additional A–B–A cycles without cold restart | PASS 3/3, `auth-network-guard-repeat3.log` and `auth-repeat-cycles-result.json` |

Checkpoint `2e9f7f9` preserves the implementation and the exact unit/build evidence, explicitly leaving complete native acceptance in progress at commit time.

Five named A–B–A cycles passed after the fix (two full revocation/queue/photo scenarios plus three sign-in switching cycles). This closes the repeatedly observed immediate-login transport failure for that matrix, not every networking situation. Remaining before broad networking acceptance: switching during active media mutation, Wi-Fi/cellular handover permutations and invalid/captive network behavior. Natural expiry and explicit refresh-token invalidation are not inferred from banning the generated user. The main real-user package and public production APK have not been replaced.
