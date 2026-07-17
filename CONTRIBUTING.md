# Contributing to App

Contributions remain licensed under `AGPL-3.0-only`; contributors retain copyright.

```bash
pnpm install
pnpm exec vp run setup
pnpm exec vp run dev
```

Before opening a change:

```bash
pnpm signoff
```

`pnpm signoff` requires authenticated GitHub CLI, installed `basecamp/gh-signoff`, a clean worktree, and a pushed branch. Use `pnpm exec vp run ci` when validating before the first push.

Protocol changes must remain language-neutral and include compatibility tests. Database changes use ordered, forward-only SQL migrations.
