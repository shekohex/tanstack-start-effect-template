# Testkit Agent Guide

- Prefer `@effect/vitest`, test layers, `TestClock`, and deterministic IDs.
- Do not manually run Effect programs inside Effect tests.
- Keep fixtures small, explicit, and reusable across package boundaries.
- Never add production runtime dependencies on `@app/testkit`.
