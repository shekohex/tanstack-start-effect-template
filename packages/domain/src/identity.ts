import * as Schema from 'effect/Schema'

import { InvitationId, MembershipId, OrganizationId, SessionId, UserId } from './ids.js'

export const OrganizationRole = Schema.Literals(['owner', 'admin', 'member'])
export type OrganizationRole = typeof OrganizationRole.Type

export const MembershipStatus = Schema.Literals(['active', 'suspended', 'removed'])
export type MembershipStatus = typeof MembershipStatus.Type

export class User extends Schema.Class<User>('@app/domain/User')({
  createdAt: Schema.String,
  displayName: Schema.String,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  id: UserId,
}) {}

export class Session extends Schema.Class<Session>('@app/domain/Session')({
  createdAt: Schema.String,
  expiresAt: Schema.String,
  id: SessionId,
  lastSeenAt: Schema.String,
  userId: UserId,
}) {}

export class Organization extends Schema.Class<Organization>('@app/domain/Organization')({
  createdAt: Schema.String,
  displayName: Schema.String,
  id: OrganizationId,
  slug: Schema.String,
}) {}

export class Membership extends Schema.Class<Membership>('@app/domain/Membership')({
  createdAt: Schema.String,
  id: MembershipId,
  organizationId: OrganizationId,
  role: OrganizationRole,
  status: MembershipStatus,
  userId: UserId,
}) {}

export class OrganizationAccess extends Schema.Class<OrganizationAccess>(
  '@app/domain/OrganizationAccess',
)({
  membership: Membership,
  organization: Organization,
}) {}

export const InvitationStatus = Schema.Literals(['pending', 'accepted', 'revoked', 'expired'])
export type InvitationStatus = typeof InvitationStatus.Type

export class OrganizationInvitation extends Schema.Class<OrganizationInvitation>(
  '@app/domain/OrganizationInvitation',
)({
  createdAt: Schema.String,
  email: Schema.String,
  expiresAt: Schema.String,
  id: InvitationId,
  organizationId: OrganizationId,
  role: OrganizationRole,
  status: InvitationStatus,
}) {}

export class OrganizationMember extends Schema.Class<OrganizationMember>(
  '@app/domain/OrganizationMember',
)({
  membership: Membership,
  user: User,
}) {}
