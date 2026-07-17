import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

if (!existsSync('.git')) {
  process.stdout.write('Skipping Lefthook installation outside a Git repository\n')
  process.exit(0)
}

const result = spawnSync('lefthook', ['install'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
