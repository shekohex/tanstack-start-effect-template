import { expect, test } from '@playwright/test'

interface VisualCase {
  readonly globals: string
  readonly name: string
  readonly story?: string
  readonly viewport: { readonly height: number; readonly width: number }
}

const cases: ReadonlyArray<VisualCase> = [
  { globals: '', name: 'component-gallery-light.png', viewport: { height: 1200, width: 1440 } },
  {
    globals: '&globals=colorMode:dark',
    name: 'component-gallery-dark.png',
    viewport: { height: 1200, width: 1440 },
  },
  {
    globals: '',
    name: 'responsive-shell-mobile.png',
    story: 'foundations-component-gallery--responsive-shell',
    viewport: { height: 844, width: 390 },
  },
]

for (const visualCase of cases) {
  test(visualCase.name, async ({ page }) => {
    await page.setViewportSize(visualCase.viewport)
    const story = visualCase.story ?? 'foundations-component-gallery--gallery'
    await page.goto(`/iframe.html?id=${story}&viewMode=story${visualCase.globals}`)
    const root = page.locator('#storybook-root')
    await expect(root).not.toBeEmpty()
    await page.evaluate(() => document.fonts.ready)
    await expect(root).toHaveScreenshot(visualCase.name)
  })
}
