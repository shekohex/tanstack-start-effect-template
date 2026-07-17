# Application Template Agent Guide

## Toolchain

- Use Vite+ through `pnpm exec vp` for formatting, linting, type checking, tests, builds, and workspace tasks.
- Run `pnpm exec vp check` for the fast quality gate and `pnpm exec vp run ci` for the complete gate.
- Start PostgreSQL and migrations with `pnpm exec vp run setup`; start API and web with `pnpm exec vp run dev`.
- Database changes are ordered, forward-only SQL migrations under `deploy/migrations`.
- `.repos/effect` is read-only reference material excluded from quality checks.

## Architecture

- `packages/domain`: JSON-compatible models and pure invariants.
- `packages/protocol`: versioned Schema contracts, RPC declarations, HttpApi, and OpenAPI.
- `packages/client`: protocol-derived clients; never imports API implementation code.
- `packages/auth`: Better Auth hidden behind focused Effect services.
- `packages/permissions`: pure, deny-by-default authorization.
- `apps/api`: composition root, SQL services, handlers, and migrations.
- `apps/web`: TanStack Start routes, same-origin `/api` proxy, shared client and UI.
- `apps/cli`: protocol/client-backed command extension point.

## Effect

- Load `.agents/skills/effect-ts/SKILL.md` before Effect work.
- Read `.repos/effect/LLMS.md` and relevant local references before inventing abstractions.
- Define services with `Context.Service`; provide complete layers only at runtime boundaries.
- Use `Effect.fn` for reusable operations and `Schema.TaggedErrorClass` for structured failures.
- Keep public domain and protocol values JSON-compatible. Never expose Effect runtime objects.

## UI

- Load `.agents/skills/shadcn/SKILL.md` before shared component work.
- Add shadcn components with `pnpm dlx shadcn@latest ... --cwd packages/ui`.
- Applications consume `@app/ui`; do not duplicate shared primitives.
- Build reusable states in Storybook first. Cover loading, empty, error, disabled, responsive, light, and dark behavior.

## Template

- Run `pnpm template:init --name <slug> --scope <scope> --env-prefix <PREFIX>` once after creating a repository from this template.
- Do not edit `.template-initialized.json`; initializer uses it to prevent accidental repeated renames.
- Keep identity-bearing defaults documented in `docs/customization.md` and covered by fixture validation.
