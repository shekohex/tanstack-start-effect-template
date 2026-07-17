import { describe, expect, it, vi } from 'vitest'

import { AppClientHttpError, createAppClient } from './index.js'

describe('application HTTP client', () => {
  it('registers with credentials and validates the response', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          session: {
            createdAt: '2026-07-17T00:00:00Z',
            expiresAt: '2026-08-16T00:00:00Z',
            id: 'ses_01',
            lastSeenAt: '2026-07-17T00:00:00Z',
            userId: 'usr_01',
          },
          user: {
            createdAt: '2026-07-17T00:00:00Z',
            displayName: 'Nora Chen',
            email: 'nora@example.com',
            emailVerified: false,
            id: 'usr_01',
          },
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      ),
    )
    const client = createAppClient({ baseUrl: 'http://app.test/api', fetch })

    const response = await client.register({
      displayName: 'Nora Chen',
      email: 'nora@example.com',
      password: 'correct horse battery staple',
    })

    expect(response.user.displayName).toBe('Nora Chen')
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://app.test/api/auth/register'),
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    )
  })

  it('preserves structured HTTP failures', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ _tag: 'AuthenticationFailed' }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      }),
    )
    const client = createAppClient({ baseUrl: 'http://app.test/api', fetch })
    await expect(
      client.login({ email: 'nora@example.com', password: 'incorrect horse battery staple' }),
    ).rejects.toBeInstanceOf(AppClientHttpError)
  })
})
