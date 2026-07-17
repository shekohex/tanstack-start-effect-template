#!/usr/bin/env node

const version = '0.0.0'

if (process.argv.includes('--version')) {
  process.stdout.write(`app ${version}\n`)
} else {
  process.stdout.write('App CLI\n\nUse --version to print the installed version.\n')
}
