/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite-plus'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const workspacePackage = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url))
export default defineConfig({
  resolve: {
    alias: {
      '@app/auth': workspacePackage('auth'),
      '@app/client': workspacePackage('client'),
      '@app/config': workspacePackage('config'),
      '@app/domain': workspacePackage('domain'),
      '@app/observability': workspacePackage('observability'),
      '@app/permissions': workspacePackage('permissions'),
      '@app/protocol': workspacePackage('protocol'),
      '@app/testkit': workspacePackage('testkit'),
      '@app/ui/components': fileURLToPath(new URL('./packages/ui/src/components', import.meta.url)),
      '@app/ui/lib': fileURLToPath(new URL('./packages/ui/src/lib', import.meta.url)),
      '@app/ui': workspacePackage('ui'),
      '@app/ui-tokens/styles.css': fileURLToPath(
        new URL('./packages/ui-tokens/src/styles.css', import.meta.url),
      ),
      '@app/ui-tokens': workspacePackage('ui-tokens'),
    },
  },
  fmt: {
    ignorePatterns: [
      '.agents/skills/effect-ts/references/CACHING.md',
      '.agents/skills/effect-ts/references/CONFIG.md',
      '.agents/skills/effect-ts/references/HTTP_CLIENTS.md',
      '.agents/skills/effect-ts/references/SCHEDULING.md',
      '.agents/skills/effect-ts/references/SCHEMA.md',
      '.agents/skills/effect-ts/references/SERVICES_LAYERS.md',
      '.agents/skills/effect-ts/references/STREAMS.md',
      '.agents/skills/effect-ts/references/TESTING.md',
      '.repos/**',
      '.pi/workflows/runs/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'storybook-static/**',
    ],
    singleQuote: true,
    semi: false,
  },
  lint: {
    ignorePatterns: [
      '.repos/**',
      '.pi/workflows/runs/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'storybook-static/**',
    ],
    plugins: ['typescript'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ['apps/web/**', 'packages/ui/**'],
        plugins: ['typescript', 'react'],
      },
      {
        files: ['apps/api/**', 'apps/cli/**', 'deploy/**', 'scripts/**'],
        env: {
          node: true,
        },
      },
      {
        files: ['**/*.test.ts', '**/*.test.tsx'],
        plugins: ['typescript', 'vitest'],
        rules: {
          'vitest/no-disabled-tests': 'error',
        },
      },
    ],
  },
  run: {
    cache: {
      scripts: false,
      tasks: true,
    },
    tasks: {
      build: {
        command: "vp run --filter './apps/*' --filter './packages/*' build",
      },
      ci: {
        command: [
          'vp check',
          'vp test --run',
          'vp run integration:test',
          'vp run e2e:test',
          'vp run visual:test',
          'vp run build',
          'vp run db:test',
        ],
        cache: false,
      },
      dev: {
        command: "vp run --parallel --filter './apps/api' --filter './apps/web' dev",
        cache: false,
      },
      'dev:services': {
        command: 'docker compose -f deploy/compose/compose.yml up -d --wait',
        cache: false,
      },
      'dev:services:down': {
        command: 'docker compose -f deploy/compose/compose.yml down',
        cache: false,
      },
      'db:migrate': {
        command: 'vp run @app/api#db:migrate',
        cache: false,
      },
      'db:status': {
        command: 'vp run @app/api#db:status',
        cache: false,
      },
      'db:test': {
        command: 'bash deploy/migrations/test-migrations.sh',
        cache: false,
      },
      'e2e:test': {
        command: 'pnpm --filter @app/web test:e2e',
        cache: false,
      },
      'integration:test': {
        command: ['vp run dev:services', 'vp run db:migrate', 'vp run @app/api#test:integration'],
        cache: false,
      },
      'storybook:test': {
        command: 'vitest --project=storybook --run',
        cache: false,
      },
      'visual:test': {
        command: 'pnpm --filter @app/ui test:visual',
        cache: false,
      },
      setup: {
        command: ['vp run dev:services', 'vp run db:migrate'],
        cache: false,
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          exclude: ['**/.repos/**', '**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
          include: ['apps/**/src/**/*.test.{ts,tsx}', 'packages/**/src/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        root: path.join(dirname, 'packages/ui'),
        plugins: [
          storybookTest({
            configDir: path.join(dirname, 'packages/ui/.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
