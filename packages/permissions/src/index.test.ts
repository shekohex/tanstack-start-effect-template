import { describe, expect, it } from 'vitest'
import { OrganizationId, UserId } from '@app/domain'

import {
  canAccessOrganization,
  canChangeMembershipRole,
  canChangeMembershipStatus,
  canRemoveMembership,
  canTransferOwnership,
  canUpdateOrganization,
} from './index.js'

const organizationId = OrganizationId.make('org_test')
const owner = {
  organizationId,
  role: 'owner' as const,
  status: 'active' as const,
  userId: UserId.make('usr_owner'),
}
const member = {
  organizationId,
  role: 'member' as const,
  status: 'active' as const,
  userId: UserId.make('usr_member'),
}

describe('organization authorization', () => {
  it('denies cross-organization access', () => {
    expect(canAccessOrganization(owner, OrganizationId.make('org_other'))).toBe(false)
    expect(canAccessOrganization(owner, organizationId)).toBe(true)
  })

  it('keeps ownership and membership mutations deny-by-default', () => {
    expect(canUpdateOrganization(owner)).toBe(true)
    expect(canUpdateOrganization({ ...owner, role: 'admin' })).toBe(false)
    expect(canChangeMembershipRole(owner, member, 'admin')).toBe(true)
    expect(canChangeMembershipRole({ ...owner, role: 'admin' }, member, 'admin')).toBe(false)
    expect(canChangeMembershipStatus(owner, member, 'suspended')).toBe(true)
    expect(canRemoveMembership(owner, member)).toBe(true)
    expect(canTransferOwnership(owner, member)).toBe(true)
  })

  it('prevents self-removal and owner mutation through generic flows', () => {
    expect(canRemoveMembership(owner, { ...member, userId: owner.userId })).toBe(false)
    expect(canChangeMembershipStatus(owner, { ...member, role: 'owner' }, 'suspended')).toBe(false)
  })
})
