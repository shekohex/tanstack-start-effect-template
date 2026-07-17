import { describe, expect, it } from 'vitest'
import * as Schema from 'effect/Schema'

import { Membership, MembershipId, OrganizationId, UserId } from './index.js'

describe('@app/domain schemas', () => {
  it('decodes branded organization identifiers', () => {
    expect(Schema.decodeUnknownSync(OrganizationId)('org_01')).toBe('org_01')
  })

  it('keeps membership wire values JSON-compatible', () => {
    const encoded = Schema.encodeSync(Membership)(
      Membership.make({
        createdAt: '2026-07-17T00:00:00.000Z',
        id: MembershipId.make('mem_01'),
        organizationId: OrganizationId.make('org_01'),
        role: 'owner',
        status: 'active',
        userId: UserId.make('usr_01'),
      }),
    )

    expect(encoded.role).toBe('owner')
    expect(JSON.stringify(encoded)).not.toContain('Effect')
  })
})
