import { promises as fs } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const repositoryRoot = process.cwd()
const markerPath = path.join(repositoryRoot, '.template-initialized.json')

function argument(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

const name = argument('name')
const scope = argument('scope')
const environmentPrefix = argument('env-prefix')

if (name === undefined || scope === undefined || environmentPrefix === undefined) {
  fail('Usage: pnpm template:init --name my-app --scope @my-org --env-prefix MY_APP')
}
if (!/^[a-z][a-z0-9-]*$/.test(name)) fail('--name must be a lowercase package slug')
if (!/^@[a-z0-9][a-z0-9._-]*$/.test(scope)) fail('--scope must be a lowercase npm scope')
if (!/^[A-Z][A-Z0-9_]*$/.test(environmentPrefix)) {
  fail('--env-prefix must contain uppercase letters, digits, and underscores')
}

try {
  await fs.access(markerPath)
  fail('Template already initialized; remove nothing and use current project identity')
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const displayName = name
  .split('-')
  .filter(Boolean)
  .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
  .join(' ')
const databaseName = name.replaceAll('-', '_')
const cookieName = `${databaseName}_session`
const apiServiceName = `${name}-api`
const iconSource = path.join(repositoryRoot, 'apps/web/public/app-icon.svg')
const iconTarget = path.join(repositoryRoot, `apps/web/public/${name}-icon.svg`)

try {
  await fs.access(iconSource)
} catch {
  fail('Expected template icon apps/web/public/app-icon.svg is missing')
}

const excludedDirectories = new Set([
  '.git',
  '.repos',
  'node_modules',
  'dist',
  'coverage',
  'storybook-static',
  'test-results',
  'playwright-report',
])
const textExtensions = new Set([
  '',
  '.css',
  '.example',
  '.json',
  '.md',
  '.mjs',
  '.sh',
  '.sql',
  '.svg',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
])

async function textFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (excludedDirectories.has(entry.name)) continue
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await textFiles(entryPath)))
    else if (textExtensions.has(path.extname(entry.name))) files.push(entryPath)
  }
  return files
}

const replacements = [
  ['effect-app-template', name],
  ['@app/', `${scope}/`],
  ['APP_AUTH_COOKIE_PREFIX=app', `${environmentPrefix}_AUTH_COOKIE_PREFIX=${name}`],
  ['APP_', `${environmentPrefix}_`],
  ['app-api', apiServiceName],
  ['app_session', cookieName],
  ['app-development-auth-secret-change-me', `${name}-development-auth-secret-change-me`],
  [
    'postgresql://app:app@127.0.0.1:5432/app',
    `postgresql://${databaseName}:${databaseName}@127.0.0.1:5432/${databaseName}`,
  ],
  ['app_schema_migrations', `${databaseName}_schema_migrations`],
  ['app_preserve_last_owner', `${databaseName}_preserve_last_owner`],
  ['app_reject_immutable_record_mutation', `${databaseName}_reject_immutable_record_mutation`],
  ['app_audit_user_registered', `${databaseName}_audit_user_registered`],
  ['app_audit_session_created', `${databaseName}_audit_session_created`],
  ['app_audit_session_revoked', `${databaseName}_audit_session_revoked`],
  ['app-postgres-data', `${name}-postgres-data`],
  ['name: app\n', `name: ${name}\n`],
  ['POSTGRES_DB: app', `POSTGRES_DB: ${databaseName}`],
  ['POSTGRES_PASSWORD: app', `POSTGRES_PASSWORD: ${databaseName}`],
  ['POSTGRES_USER: app', `POSTGRES_USER: ${databaseName}`],
  ['-U app -d app', `-U ${databaseName} -d ${databaseName}`],
  ["Config.withDefault('app')", `Config.withDefault('${name}')`],
  ["config.authCookiePrefix, 'app'", `config.authCookiePrefix, '${name}'`],
  ['"app": "dist/main.js"', `"${name}": "dist/main.js"`],
  ['`app ${version}', `\`${name} \${version}`],
  ['app-color-mode', `${name}-color-mode`],
  ['app-integration', `${name}-integration`],
  ['/app-icon.svg', `/${name}-icon.svg`],
  ['aria-label="App"', `aria-label="${displayName}"`],
  ["'App'", `'${displayName}'`],
  ['"App"', `"${displayName}"`],
  ['App CLI', `${displayName} CLI`],
  ['App API', `${displayName} API`],
]

const edits = []
for (const file of await textFiles(repositoryRoot)) {
  let content = await fs.readFile(file, 'utf8')
  const original = content
  for (const [from, to] of replacements) content = content.replaceAll(from, to)
  const relativePath = path.relative(repositoryRoot, file)
  if (!relativePath.startsWith('.agents/skills/shadcn/')) {
    content = content.replace(/\bApp\b/g, displayName)
  }
  if (content !== original) edits.push({ content, file })
}

for (const edit of edits) await fs.writeFile(edit.file, edit.content)
await fs.rename(iconSource, iconTarget)

const formatResult = spawnSync('pnpm', ['exec', 'vp', 'fmt', '--write'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
})
if (formatResult.status !== 0) fail('Project identity changed, but Vite+ formatting failed')

await fs.writeFile(
  markerPath,
  `${JSON.stringify({ displayName, environmentPrefix, name, scope }, null, 2)}\n`,
)

process.stdout.write(`Initialized ${displayName} with ${scope}/* and ${environmentPrefix}_*\n`)
