import type { MembershipStatus, OrganizationId, OrganizationRole, UserId } from '@app/domain'

export type OrganizationAuthorizationContext = {
  readonly organizationId: OrganizationId
  readonly role: OrganizationRole
  readonly status: MembershipStatus
  readonly userId: UserId
}

export type MembershipAuthorizationTarget = {
  readonly organizationId: OrganizationId
  readonly role: OrganizationRole
  readonly status: MembershipStatus
  readonly userId: UserId
}

export function canAccessOrganization(
  context: OrganizationAuthorizationContext,
  organizationId: OrganizationId,
): boolean {
  return context.status === 'active' && context.organizationId === organizationId
}

export function canManageOrganization(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canInviteMember(context: OrganizationAuthorizationContext): boolean {
  return context.status === 'active' && canManageOrganization(context.role)
}

export function canUpdateOrganization(context: OrganizationAuthorizationContext): boolean {
  return context.status === 'active' && context.role === 'owner'
}

export function canChangeMembershipRole(
  actor: OrganizationAuthorizationContext,
  target: MembershipAuthorizationTarget,
  desiredRole: Exclude<OrganizationRole, 'owner'>,
): boolean {
  return (
    canAccessOrganization(actor, target.organizationId) &&
    actor.role === 'owner' &&
    target.status === 'active' &&
    target.role !== 'owner' &&
    target.role !== desiredRole
  )
}

export function canChangeMembershipStatus(
  actor: OrganizationAuthorizationContext,
  target: MembershipAuthorizationTarget,
  desiredStatus: Extract<MembershipStatus, 'active' | 'suspended'>,
): boolean {
  return (
    canAccessOrganization(actor, target.organizationId) &&
    actor.userId !== target.userId &&
    target.status !== 'removed' &&
    target.status !== desiredStatus &&
    target.role !== 'owner' &&
    (actor.role === 'owner' || (actor.role === 'admin' && target.role === 'member'))
  )
}

export function canRemoveMembership(
  actor: OrganizationAuthorizationContext,
  target: MembershipAuthorizationTarget,
): boolean {
  return (
    canAccessOrganization(actor, target.organizationId) &&
    actor.role === 'owner' &&
    actor.userId !== target.userId &&
    target.status === 'active' &&
    target.role !== 'owner'
  )
}

export function canTransferOwnership(
  actor: OrganizationAuthorizationContext,
  target: MembershipAuthorizationTarget,
): boolean {
  return (
    canAccessOrganization(actor, target.organizationId) &&
    actor.role === 'owner' &&
    actor.userId !== target.userId &&
    target.role !== 'owner' &&
    target.status === 'active'
  )
}
