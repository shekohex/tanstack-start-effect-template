import * as Schema from 'effect/Schema'

export const AuditEventId = Schema.String.pipe(Schema.brand('AuditEventId'))
export type AuditEventId = typeof AuditEventId.Type

export const EventId = Schema.String.pipe(Schema.brand('EventId'))
export type EventId = typeof EventId.Type

export const InvitationId = Schema.String.pipe(Schema.brand('InvitationId'))
export type InvitationId = typeof InvitationId.Type

export const MembershipId = Schema.String.pipe(Schema.brand('MembershipId'))
export type MembershipId = typeof MembershipId.Type

export const OrganizationId = Schema.String.pipe(Schema.brand('OrganizationId'))
export type OrganizationId = typeof OrganizationId.Type

export const SessionId = Schema.String.pipe(Schema.brand('SessionId'))
export type SessionId = typeof SessionId.Type

export const UserId = Schema.String.pipe(Schema.brand('UserId'))
export type UserId = typeof UserId.Type
