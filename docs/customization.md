# Customization

## Project Identity

Run initializer once:

```bash
pnpm template:init --name my-app --scope @my-org --env-prefix MY_APP
```

Arguments:

- `--name`: lowercase package/application slug.
- `--scope`: npm scope, including `@`.
- `--env-prefix`: uppercase environment prefix without trailing underscore.

Default template identity is `effect-app-template`, `@app/*`, `APP_*`, visible name `App`, API service `app-api`, CLI binary `app`, cookie prefix `app`, and database/Compose identity `app`.

Initializer validates all arguments before editing, updates source-controlled text files except `.repos/effect`, renames web icon, and writes `.template-initialized.json`. Repeated execution exits without changes.

## Replace Example Domain

Organization membership is a real vertical slice and extension example, not required product direction. Replace it from inside out:

1. Update domain schemas and invariants.
2. Update pure permission decisions.
3. Update protocol contracts and compatibility tests.
4. Add forward-only migrations and API services.
5. Update client/web flows and Storybook states.

Keep authentication separate from authorization and keep public values JSON-compatible.

## UI

Change semantic tokens in `packages/ui-tokens/src/styles.css`. Add shared primitives through shadcn CLI. Keep app-specific composition in `apps/web`; move reusable composites into `packages/ui` with Storybook coverage.

## Add Apps Or Packages

Add workspace directory, package manifest, TypeScript project reference, Vite+ alias/task participation, nearest `AGENTS.md`, and validation coverage. Applications must not import implementation internals from another application.
