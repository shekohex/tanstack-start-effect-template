import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const password = 'correct-horse-battery'

test('registers, creates an organization, restores session, and signs back in', async ({
  page,
}) => {
  const identifier = randomUUID().slice(0, 8)
  const displayName = `Owner ${identifier}`
  const email = `owner-${identifier}@example.com`
  const organizationName = `Organization ${identifier}`
  const organizationSlug = `organization-${identifier}`

  await page.goto('/')
  await page.getByRole('textbox', { name: 'Display name' }).fill(displayName)
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await page.getByRole('textbox', { name: 'Organization name' }).fill(organizationName)
  await page.getByRole('textbox', { name: 'Organization URL' }).fill(organizationSlug)
  await page.getByRole('button', { name: 'Create organization' }).click()
  await expect(page.getByRole('heading', { name: organizationName })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: organizationName })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('tab', { name: 'Sign in' }).click()
  const signInPanel = page.getByRole('tabpanel', { name: 'Sign in' })
  await signInPanel.getByRole('textbox', { name: 'Email' }).fill(email)
  await signInPanel.getByRole('textbox', { name: 'Password' }).fill(password)
  await signInPanel.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: organizationName })).toBeVisible()
})
