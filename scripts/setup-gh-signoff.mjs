import { spawnSync } from 'node:child_process'
import process from 'node:process'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
  return result.stdout?.trim() ?? ''
}

run('gh', ['--version'])
run('gh', ['auth', 'status'])
run('git', ['remote', 'get-url', 'origin'])

const installedExtensions = run('gh', ['extension', 'list'], { capture: true })
if (!installedExtensions.includes('basecamp/gh-signoff')) {
  run('gh', ['extension', 'install', 'basecamp/gh-signoff'])
}

const defaultBranch = run(
  'gh',
  ['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'],
  { capture: true },
)

run('gh', ['signoff', 'install', '--branch', defaultBranch, 'ci'])
process.stdout.write(`gh-signoff ready: signoff/ci required on ${defaultBranch}\n`)
