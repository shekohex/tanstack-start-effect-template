# Client Agent Guide

- Build clients from `@app/protocol`; do not restate wire types.
- Prefer Effect RPC over WebSocket for first-party TypeScript consumers.
- Validate public HTTP responses with Effect Schema before returning them.
- Keep transport setup in layers and avoid importing API internals.
