import type { Decorator, Preview } from '@storybook/react-vite'
import { useEffect, type ReactNode } from 'react'
import { initialize, mswLoader } from 'msw-storybook-addon'

import { TooltipProvider } from '../src/components/tooltip'
import { applyColorMode, type ColorMode } from '../src/theme'
import './preview.css'

initialize({ onUnhandledRequest: 'bypass' })

function ThemeSurface({
  children,
  mode,
}: {
  readonly children: ReactNode
  readonly mode: ColorMode
}) {
  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyColorMode(document.documentElement, mode, colorScheme.matches)
    apply()
    colorScheme.addEventListener('change', apply)
    return () => colorScheme.removeEventListener('change', apply)
  }, [mode])
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </TooltipProvider>
  )
}

const withTheme: Decorator = (Story, context) => (
  <ThemeSurface mode={context.globals.colorMode as ColorMode}>
    <Story />
  </ThemeSurface>
)

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [withTheme],
  loaders: [mswLoader],
  globalTypes: {
    colorMode: {
      description: 'Application color mode',
      toolbar: {
        icon: 'mirror',
        items: [
          { title: 'System', value: 'system' },
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
      },
    },
  },
  initialGlobals: { colorMode: 'light' },
  parameters: {
    layout: 'fullscreen',
    a11y: { context: { exclude: ['[data-base-ui-focus-guard]'] }, test: 'error' },
  },
}

export default preview
