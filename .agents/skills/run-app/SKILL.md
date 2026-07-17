---
name: run-app
description: Build, start, run, test, drive, and screenshot the App full-stack application. Use for browser verification of the web app and its Effect API.
---

Run App from the repository root with `.agents/skills/run-app/driver.sh`. The driver manages PostgreSQL, the Effect API, and TanStack Start. Drive the evolving web interface separately with `agent-browser` snapshots and element references.

## Prerequisites

Node.js 24, pnpm, Docker Compose, Vite+, and `agent-browser` must be available. Verify the browser installation with:

```bash
agent-browser --version && agent-browser doctor
```

## Setup

Install workspace dependencies, start PostgreSQL, and apply migrations:

```bash
bash .agents/skills/run-app/driver.sh setup
```

## Run

Start the API and web development servers and wait for the same-origin health endpoint:

```bash
bash .agents/skills/run-app/driver.sh start
```

Inspect the current interface before choosing interactions:

```bash
SESSION="$(agent-browser session id --scope worktree --prefix run-app)"
NO_PROXY=localhost,127.0.0.1 agent-browser --session "$SESSION" open http://localhost:3000
agent-browser --session "$SESSION" snapshot -i
```

Use the current snapshot's `@eN` references to interact. Re-snapshot after navigation or dynamic changes, then capture evidence and inspect errors:

```bash
agent-browser --session "$SESSION" screenshot --full /tmp/app.png
agent-browser --session "$SESSION" errors
agent-browser --session "$SESSION" close
```

The application runs at `http://localhost:3000`. Server output is written to `/tmp/run-app.log`.

Stop the API and web processes while leaving PostgreSQL available for the next run:

```bash
bash .agents/skills/run-app/driver.sh stop
```

Stop the application and remove the development Compose services:

```bash
bash .agents/skills/run-app/driver.sh down
```

## Build And Test

Run the complete local gate:

```bash
pnpm exec vp run ci
```

## Gotchas

- Use `pnpm exec vp run dev`, not root `vp dev`; root `vp dev` launches one Vite server instead of the App task graph.
- The API watcher syntax is `tsx watch --conditions=development src/main.ts`; placing `--conditions` before `watch` makes `tsx` resolve a script named `watch`.
- WebSocket RPC keeps a request open, so network-idle waits can be unsuitable. Wait for an interface element or explicit DOM state instead.
- Browser references change after navigation and dynamic interaction. Take a new snapshot before continuing with `@eN` references.
- Vite+ launches the API and web server as child processes. The driver starts them in a dedicated process group so `stop` terminates the complete stack instead of only the task runner.

## Troubleshooting

- `ERR_MODULE_NOT_FOUND ... apps/api/watch`: the `tsx` watcher arguments are in the wrong order. Use the checked-in API `dev` script.
- `EADDRINUSE` on ports `3000` or `4100`: run `bash .agents/skills/run-app/driver.sh stop`, then start again.
- The page renders but API status is unavailable: inspect `/tmp/run-app.log` and verify `curl -fsS http://localhost:3000/api/healthz` succeeds.
