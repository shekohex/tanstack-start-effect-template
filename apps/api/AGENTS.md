# API Agent Guide

- Keep business behavior behind `Context.Service` services and `Layer` implementations.
- Start the full stack with `pnpm exec vp run dev`; use `pnpm exec vp run @app/api#dev` for API-only work.
- Define wire contracts in `@app/protocol`; do not create handler-local payload types.
- Use Effect RPC for first-party TypeScript clients and HTTP/OpenAPI for public integrations.
- Provide SQL, config, transports, and handlers only in the application layer graph.
