export type ColorMode = 'dark' | 'light' | 'system'

export const defaultColorMode: ColorMode = 'system'

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'dark' || value === 'light' || value === 'system'
}

export function applyColorMode(root: HTMLElement, mode: ColorMode, prefersDark: boolean): void {
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
  root.style.colorScheme = resolved
}
