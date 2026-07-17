import { describe, expect, it } from 'vitest'

import { FakeClock, createIdFactory } from './index.js'

describe('testkit', () => {
  it('provides deterministic time and identifiers', () => {
    const clock = new FakeClock('2026-07-15T00:00:00.000Z')
    const nextId = createIdFactory('evt')

    expect(clock.now().toISOString()).toBe('2026-07-15T00:00:00.000Z')
    expect([nextId(), nextId()]).toEqual(['evt_0001', 'evt_0002'])
  })
})
