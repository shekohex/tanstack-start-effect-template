# UI Agent Guide

- Reuse `@app/ui-tokens` and preserve Base UI accessibility behavior.
- Load `.agents/skills/shadcn/SKILL.md` before component changes.
- Run shadcn commands with `--cwd packages/ui`; do not generate app-local primitives.
- Build reusable composites and state variants in Storybook before app integration.
- Keep animation purposeful; `motion` is available for meaningful transitions.
