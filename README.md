# Effect App Template

Opinionated full-stack TypeScript template using Vite+, Effect, TanStack Start, Better Auth, PostgreSQL, and shared shadcn/Base UI components.

## Requirements

- Node.js 24+
- pnpm 11+
- Docker with Compose

## Initialize

Run once after creating a repository from this template:

```bash
pnpm template:init --name my-app --scope @my-org --env-prefix MY_APP
```

This updates package scope, environment prefix, service/database/cookie defaults, CLI binary, web metadata, Compose identifiers, and visible application name. It records completion in `.template-initialized.json`.

## Start

```bash
pnpm install
cp .env.example .env
pnpm exec vp run setup
pnpm exec vp run dev
```

Web: `http://localhost:3000`

API OpenAPI document: `http://localhost:4100/openapi.json`

## Storybook

```bash
pnpm exec vp run @app/ui#storybook
```

Storybook: `http://localhost:6006`

## Effect development

Effect v4 is pinned to the latest selected beta across `effect` and all `@effect/*` packages. The upstream v4 source is vendored as a squashed Git subtree at `.repos/effect` so humans and coding agents can inspect current APIs, tests, and implementation patterns.

Update the reference source with:

```bash
git subtree pull \
  --prefix=.repos/effect \
  https://github.com/Effect-TS/effect.git \
  main \
  --squash
```

Agents must load `.agents/skills/effect-ts/SKILL.md` and read `.repos/effect/LLMS.md` before writing Effect code.

Every directory under `apps/` and `packages/` has a slim `README.md` and local `AGENTS.md`. Read the nearest guide before changing that workspace.

## Validate

```bash
pnpm exec vp check
pnpm exec vp test --run
pnpm exec vp run integration:test
pnpm exec vp run e2e:test
pnpm exec vp run visual:test
pnpm exec vp run build
pnpm exec vp run db:test
pnpm exec vp run ci
```

## Local Signoff

After publishing the repository and authenticating GitHub CLI, run once:

```bash
pnpm signoff:setup
```

This installs `basecamp/gh-signoff` and requires `signoff/ci` on the default branch. Run before adding other branch-protection rules because upstream `gh signoff install` configures branch protection.

For each clean, pushed commit:

```bash
pnpm signoff
```

This runs the complete local Vite+ CI graph, then posts the `signoff/ci` commit status.

See `docs/architecture.md`, `docs/customization.md`, `docs/authentication.md`, `docs/migrations.md`, and `docs/ai-agents.md`.

## GitHub Template

After pushing to an approved remote, enable GitHub repository setting **Template repository**. Remote creation, pushes, and setting changes are intentionally not automated.

License: `AGPL-3.0-only`.
