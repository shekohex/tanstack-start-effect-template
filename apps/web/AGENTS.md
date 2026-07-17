# Web Agent Guide

- Use TanStack Start file routes; do not edit `routeTree.gen.ts` manually.
- Reuse `@app/ui`, `@app/ui-tokens`, and `@app/client`.
- Keep first-party operations on Effect RPC and authentication/system operations on HttpApi.
- Preserve same-origin `/api` proxying; never hardcode browser API hosts.
- Verify responsive, keyboard, light, dark, loading, empty, and error behavior.
