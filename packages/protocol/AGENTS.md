# Protocol Agent Guide

- Treat every exported wire shape as a versioned compatibility contract.
- Define payloads and errors with Effect Schema, then derive RPC, HTTP, JSON Schema, and OpenAPI artifacts.
- Keep encoded values language-neutral and safely ignore additive fields where required.
- Add compatibility tests for every protocol behavior change.
