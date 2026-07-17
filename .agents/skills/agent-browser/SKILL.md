---
name: agent-browser
description: Browser automation for running and verifying this web application.
---

# Browser Verification

Install and verify `agent-browser`:

```bash
agent-browser --version
agent-browser doctor
```

Load current CLI guidance before use:

```bash
agent-browser skills get core
```

Use a worktree-scoped session, inspect before interacting, re-snapshot after navigation, capture screenshots, and inspect browser errors:

```bash
SESSION="$(agent-browser session id --scope worktree --prefix run-app)"
agent-browser --session "$SESSION" open http://localhost:3000
agent-browser --session "$SESSION" snapshot -i
agent-browser --session "$SESSION" screenshot --full /tmp/app.png
agent-browser --session "$SESSION" errors
agent-browser --session "$SESSION" close
```
