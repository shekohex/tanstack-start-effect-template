import { spawnSync } from 'node:child_process'
import process from 'node:process'

const environment = {
  ...process.env,
  APP_DATABASE_URL: process.env.APP_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:55432/app',
  APP_POSTGRES_PORT: process.env.APP_POSTGRES_PORT ?? '55432',
}

const result = spawnSync('pnpm', ['exec', 'vp', 'run', 'ci'], {
  env: environment,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
