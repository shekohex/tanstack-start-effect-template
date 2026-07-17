# Authentication

Better Auth is private infrastructure behind `packages/auth`.

- `AuthEngine` owns registration, login, logout, and session lookup.
- Better Auth persistence uses a custom Effect SQL adapter.
- Password hashing uses Argon2 behind `PasswordHasher`.
- API `IdentityService` translates private auth errors into protocol errors.
- HTTP handlers own cookie request/response boundaries.
- RPC middleware resolves cookie session and provides `CurrentRpcSession`.
- Authorization remains in pure `packages/permissions` decisions and API workflows.

Add providers inside `packages/auth`, then expose only neutral session/user contracts through protocol. Never expose Better Auth implementation types, credentials, raw tokens, or cookies.
