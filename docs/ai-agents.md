# AI Agents

Repository guidance is layered:

- Root `AGENTS.md`: toolchain and architecture boundaries.
- App/package `AGENTS.md`: local ownership rules.
- `.agents/skills/effect-ts`: Effect v4 conventions, including caching, config, HTTP client, scheduling, schema, services, streams, and testing references.
- `.agents/skills/shadcn`: shared UI workflow.
- `.agents/skills/run-app`: safe full-stack startup and browser verification.
- `.repos/effect`: read-only source reference; start with `.repos/effect/LLMS.md`.

Generated files:

- `apps/web/src/routeTree.gen.ts`: regenerate with `pnpm --filter @app/web generate-routes`; do not edit manually.
- Storybook static output, build output, coverage, and Playwright reports are ignored artifacts.

Validation order:

```bash
pnpm exec vp check
pnpm exec vp test --run
pnpm exec vp run ci
```

After a clean commit is pushed, `pnpm signoff` reruns the complete gate and publishes the required `signoff/ci` status through `basecamp/gh-signoff`.

Prefer narrow checks while editing, then complete gate. Keep runtime runners and complete layer provisioning at application boundaries.
