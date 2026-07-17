# @app/ui

Shared Base UI and shadcn primitives plus reusable application composites.

Run Storybook:

```bash
pnpm exec vp run @app/ui#storybook
```

Run accessibility/interaction and visual checks:

```bash
pnpm exec vp run storybook:test
pnpm exec vp run visual:test
```

Add components only through `pnpm dlx shadcn@latest add <component> --cwd packages/ui`. Keep app code focused on composition and data flow. Keep generic primitives, auth forms, organization controls, application shell, member management, theme selection, and state surfaces here. `motion` remains available for purposeful transitions.
