import {
  CanonicalReference,
  InvitationId,
  Organization,
  OrganizationAccess,
  OrganizationId,
  OrganizationInvitation,
  OrganizationMember,
  Session,
  User,
} from '@app/domain'
import type { EventId, SessionId, UserId } from '@app/domain'
import * as Context from 'effect/Context'
import * as Schema from 'effect/Schema'
import * as HttpApi from 'effect/unstable/httpapi/HttpApi'
import * as HttpApiEndpoint from 'effect/unstable/httpapi/HttpApiEndpoint'
import * as HttpApiGroup from 'effect/unstable/httpapi/HttpApiGroup'
import * as HttpApiSchema from 'effect/unstable/httpapi/HttpApiSchema'
import * as OpenApi from 'effect/unstable/httpapi/OpenApi'
import * as Rpc from 'effect/unstable/rpc/Rpc'
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup'
import * as RpcMiddleware from 'effect/unstable/rpc/RpcMiddleware'

export const protocolVersion = '1.0.0' as const

export class ProtocolError extends Schema.TaggedErrorClass<ProtocolError>()('ProtocolError', {
  code: Schema.String,
  message: Schema.String,
  reference: Schema.optionalKey(CanonicalReference),
  retryable: Schema.Boolean,
}) {}

export class InvalidIdentityInput extends Schema.TaggedErrorClass<InvalidIdentityInput>()(
  'InvalidIdentityInput',
  { field: Schema.String, message: Schema.String },
  { httpApiStatus: 400 },
) {}

export class EmailAlreadyRegistered extends Schema.TaggedErrorClass<EmailAlreadyRegistered>()(
  'EmailAlreadyRegistered',
  { message: Schema.String },
  { httpApiStatus: 409 },
) {}

export class AuthenticationFailed extends Schema.TaggedErrorClass<AuthenticationFailed>()(
  'AuthenticationFailed',
  { message: Schema.String },
  { httpApiStatus: 401 },
) {}

export class Unauthenticated extends Schema.TaggedErrorClass<Unauthenticated>()(
  'Unauthenticated',
  { message: Schema.String },
  { httpApiStatus: 401 },
) {}

export class OrganizationSlugUnavailable extends Schema.TaggedErrorClass<OrganizationSlugUnavailable>()(
  'OrganizationSlugUnavailable',
  { slug: Schema.String },
  { httpApiStatus: 409 },
) {}

export class PermissionDenied extends Schema.TaggedErrorClass<PermissionDenied>()(
  'PermissionDenied',
  { action: Schema.String, message: Schema.String },
) {}

export class InvitationAlreadyPending extends Schema.TaggedErrorClass<InvitationAlreadyPending>()(
  'InvitationAlreadyPending',
  { email: Schema.String, organizationId: Schema.String },
) {}

export class InvitationUnavailable extends Schema.TaggedErrorClass<InvitationUnavailable>()(
  'InvitationUnavailable',
  { message: Schema.String },
) {}

export class InvitationEmailMismatch extends Schema.TaggedErrorClass<InvitationEmailMismatch>()(
  'InvitationEmailMismatch',
  { message: Schema.String },
) {}

export class MembershipNotFound extends Schema.TaggedErrorClass<MembershipNotFound>()(
  'MembershipNotFound',
  { membershipId: Schema.String },
) {}

export class OwnerInvariantViolation extends Schema.TaggedErrorClass<OwnerInvariantViolation>()(
  'OwnerInvariantViolation',
  { message: Schema.String },
) {}

export class IdentityPersistenceFailed extends Schema.TaggedErrorClass<IdentityPersistenceFailed>()(
  'IdentityPersistenceFailed',
  { message: Schema.String, retryable: Schema.Boolean },
  { httpApiStatus: 500 },
) {}

const Email = Schema.String.check(
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Must be a valid email address' }),
)
const Slug = Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/))

export class RegisterWithEmail extends Schema.Class<RegisterWithEmail>(
  '@app/protocol/RegisterWithEmail',
)({
  displayName: Schema.String.check(Schema.isLengthBetween(1, 80)),
  email: Email,
  password: Schema.String.check(Schema.isLengthBetween(12, 128)),
}) {}

export class LoginWithEmail extends Schema.Class<LoginWithEmail>('@app/protocol/LoginWithEmail')({
  email: Email,
  password: Schema.String.check(Schema.isLengthBetween(12, 128)),
}) {}

export class AuthSessionResponse extends Schema.Class<AuthSessionResponse>(
  '@app/protocol/AuthSessionResponse',
)({ session: Session, user: User }) {}

export class LogoutResponse extends Schema.Class<LogoutResponse>('@app/protocol/LogoutResponse')({
  loggedOut: Schema.Literal(true),
}) {}

export class CreateOrganization extends Schema.Class<CreateOrganization>(
  '@app/protocol/CreateOrganization',
)({
  displayName: Schema.String.check(Schema.isLengthBetween(1, 80)),
  slug: Slug,
}) {}

export class UpdateOrganization extends Schema.Class<UpdateOrganization>(
  '@app/protocol/UpdateOrganization',
)({
  displayName: Schema.String.check(Schema.isLengthBetween(1, 80)),
  organizationId: OrganizationId,
  slug: Slug,
}) {}

export class OrganizationListResponse extends Schema.Class<OrganizationListResponse>(
  '@app/protocol/OrganizationListResponse',
)({ organizations: Schema.Array(OrganizationAccess) }) {}

export class CreateEmailInvitation extends Schema.Class<CreateEmailInvitation>(
  '@app/protocol/CreateEmailInvitation',
)({
  email: Email,
  organizationId: OrganizationId,
  role: Schema.Literals(['admin', 'member']),
}) {}

export class EmailInvitationCreated extends Schema.Class<EmailInvitationCreated>(
  '@app/protocol/EmailInvitationCreated',
)({ invitation: OrganizationInvitation, token: Schema.String }) {}

export class AcceptEmailInvitation extends Schema.Class<AcceptEmailInvitation>(
  '@app/protocol/AcceptEmailInvitation',
)({ token: Schema.String }) {}

export class RevokeEmailInvitation extends Schema.Class<RevokeEmailInvitation>(
  '@app/protocol/RevokeEmailInvitation',
)({ invitationId: InvitationId, organizationId: OrganizationId }) {}

export class ListOrganizationMembers extends Schema.Class<ListOrganizationMembers>(
  '@app/protocol/ListOrganizationMembers',
)({ organizationId: OrganizationId }) {}

export class OrganizationMembersResponse extends Schema.Class<OrganizationMembersResponse>(
  '@app/protocol/OrganizationMembersResponse',
)({ members: Schema.Array(OrganizationMember) }) {}

export class ChangeMembershipRole extends Schema.Class<ChangeMembershipRole>(
  '@app/protocol/ChangeMembershipRole',
)({
  membershipId: Schema.String,
  organizationId: OrganizationId,
  role: Schema.Literals(['admin', 'member']),
}) {}

export class ChangeMembershipStatus extends Schema.Class<ChangeMembershipStatus>(
  '@app/protocol/ChangeMembershipStatus',
)({
  membershipId: Schema.String,
  organizationId: OrganizationId,
  status: Schema.Literals(['active', 'suspended']),
}) {}

export class RemoveOrganizationMember extends Schema.Class<RemoveOrganizationMember>(
  '@app/protocol/RemoveOrganizationMember',
)({ membershipId: Schema.String, organizationId: OrganizationId }) {}

export class TransferOrganizationOwnership extends Schema.Class<TransferOrganizationOwnership>(
  '@app/protocol/TransferOrganizationOwnership',
)({ membershipId: Schema.String, organizationId: OrganizationId }) {}

export class CurrentRpcSession extends Context.Service<
  CurrentRpcSession,
  { readonly sessionId: SessionId; readonly userId: UserId }
>()('@app/protocol/CurrentRpcSession') {}

const SessionRpcError = Schema.Union([Unauthenticated, IdentityPersistenceFailed])

export class SessionRpcMiddleware extends RpcMiddleware.Service<
  SessionRpcMiddleware,
  { provides: CurrentRpcSession }
>()('@app/protocol/SessionRpcMiddleware', { error: SessionRpcError }) {}

export class HealthResponse extends Schema.Class<HealthResponse>('@app/protocol/HealthResponse')({
  service: Schema.Literal('app-api'),
  status: Schema.Literal('ok'),
  version: Schema.String,
}) {}

export class PongResponse extends Schema.Class<PongResponse>('@app/protocol/PongResponse')({
  message: Schema.Literal('pong'),
  service: Schema.Literal('app-api'),
}) {}

export class ReadinessResponse extends Schema.Class<ReadinessResponse>(
  '@app/protocol/ReadinessResponse',
)({
  checks: Schema.Struct({ database: Schema.Literal('ok') }),
  service: Schema.Literal('app-api'),
  status: Schema.Literal('ready'),
  version: Schema.String,
}) {}

export class ServiceUnavailable extends Schema.TaggedErrorClass<ServiceUnavailable>()(
  'ServiceUnavailable',
  {
    check: Schema.String,
    message: Schema.String,
    retryable: Schema.Literal(true),
    service: Schema.Literal('app-api'),
  },
) {}

export type DurableEvent<Type extends string, Payload> = {
  readonly actorUserId: UserId | null
  readonly aggregate: CanonicalReference
  readonly createdAt: string
  readonly id: EventId
  readonly organizationId: OrganizationId
  readonly payload: Payload
  readonly sequence: string
  readonly type: Type
  readonly version: number
}

export class SystemHealth extends Rpc.make('system.health', { success: HealthResponse }) {}
export class SystemPing extends Rpc.make('system.ping', { success: PongResponse }) {}
export class SystemReadiness extends Rpc.make('system.readiness', {
  error: ServiceUnavailable,
  success: ReadinessResponse,
}) {}

export class OrganizationListRpc extends Rpc.make('organization.list', {
  error: IdentityPersistenceFailed,
  success: OrganizationListResponse,
}) {}
export class OrganizationCreateRpc extends Rpc.make('organization.create', {
  error: Schema.Union([
    InvalidIdentityInput,
    OrganizationSlugUnavailable,
    IdentityPersistenceFailed,
  ]),
  payload: CreateOrganization,
  success: OrganizationAccess,
}) {}
export class OrganizationUpdateRpc extends Rpc.make('organization.update', {
  error: Schema.Union([
    PermissionDenied,
    InvalidIdentityInput,
    OrganizationSlugUnavailable,
    IdentityPersistenceFailed,
  ]),
  payload: UpdateOrganization,
  success: Organization,
}) {}
export class InvitationCreateRpc extends Rpc.make('invitation.createEmail', {
  error: Schema.Union([PermissionDenied, InvitationAlreadyPending, IdentityPersistenceFailed]),
  payload: CreateEmailInvitation,
  success: EmailInvitationCreated,
}) {}
export class InvitationAcceptRpc extends Rpc.make('invitation.acceptEmail', {
  error: Schema.Union([InvitationUnavailable, InvitationEmailMismatch, IdentityPersistenceFailed]),
  payload: AcceptEmailInvitation,
  success: OrganizationAccess,
}) {}
export class InvitationRevokeRpc extends Rpc.make('invitation.revoke', {
  error: Schema.Union([PermissionDenied, InvitationUnavailable, IdentityPersistenceFailed]),
  payload: RevokeEmailInvitation,
  success: OrganizationInvitation,
}) {}
export class OrganizationMembersListRpc extends Rpc.make('membership.list', {
  error: Schema.Union([PermissionDenied, IdentityPersistenceFailed]),
  payload: ListOrganizationMembers,
  success: OrganizationMembersResponse,
}) {}
export class MembershipChangeRoleRpc extends Rpc.make('membership.changeRole', {
  error: Schema.Union([
    PermissionDenied,
    MembershipNotFound,
    OwnerInvariantViolation,
    IdentityPersistenceFailed,
  ]),
  payload: ChangeMembershipRole,
  success: OrganizationMember,
}) {}
export class MembershipChangeStatusRpc extends Rpc.make('membership.changeStatus', {
  error: Schema.Union([
    PermissionDenied,
    MembershipNotFound,
    OwnerInvariantViolation,
    IdentityPersistenceFailed,
  ]),
  payload: ChangeMembershipStatus,
  success: OrganizationMember,
}) {}
export class MembershipRemoveRpc extends Rpc.make('membership.remove', {
  error: Schema.Union([
    PermissionDenied,
    MembershipNotFound,
    OwnerInvariantViolation,
    IdentityPersistenceFailed,
  ]),
  payload: RemoveOrganizationMember,
  success: OrganizationMember,
}) {}
export class OrganizationTransferOwnershipRpc extends Rpc.make('organization.transferOwnership', {
  error: Schema.Union([
    PermissionDenied,
    MembershipNotFound,
    OwnerInvariantViolation,
    IdentityPersistenceFailed,
  ]),
  payload: TransferOrganizationOwnership,
  success: OrganizationMember,
}) {}

export const AppRpcs = RpcGroup.make(
  SystemHealth,
  SystemPing,
  SystemReadiness,
  OrganizationListRpc.middleware(SessionRpcMiddleware),
  OrganizationCreateRpc.middleware(SessionRpcMiddleware),
  OrganizationUpdateRpc.middleware(SessionRpcMiddleware),
  InvitationCreateRpc.middleware(SessionRpcMiddleware),
  InvitationAcceptRpc.middleware(SessionRpcMiddleware),
  InvitationRevokeRpc.middleware(SessionRpcMiddleware),
  OrganizationMembersListRpc.middleware(SessionRpcMiddleware),
  MembershipChangeRoleRpc.middleware(SessionRpcMiddleware),
  MembershipChangeStatusRpc.middleware(SessionRpcMiddleware),
  MembershipRemoveRpc.middleware(SessionRpcMiddleware),
  OrganizationTransferOwnershipRpc.middleware(SessionRpcMiddleware),
)

export class SystemHttpApi extends HttpApiGroup.make('system')
  .add(HttpApiEndpoint.get('health', '/healthz', { success: HealthResponse }))
  .add(
    HttpApiEndpoint.get('readiness', '/readyz', {
      error: ServiceUnavailable.pipe(HttpApiSchema.status(503)),
      success: ReadinessResponse,
    }),
  ) {}

export class AuthHttpApi extends HttpApiGroup.make('auth')
  .add(
    HttpApiEndpoint.post('register', '/auth/register', {
      error: [InvalidIdentityInput, EmailAlreadyRegistered, IdentityPersistenceFailed],
      payload: RegisterWithEmail,
      success: AuthSessionResponse,
    }),
  )
  .add(
    HttpApiEndpoint.post('login', '/auth/login', {
      error: [InvalidIdentityInput, AuthenticationFailed, IdentityPersistenceFailed],
      payload: LoginWithEmail,
      success: AuthSessionResponse,
    }),
  )
  .add(
    HttpApiEndpoint.get('session', '/auth/session', {
      error: [Unauthenticated, IdentityPersistenceFailed],
      success: AuthSessionResponse,
    }),
  )
  .add(
    HttpApiEndpoint.post('logout', '/auth/logout', {
      error: IdentityPersistenceFailed,
      success: LogoutResponse,
    }),
  ) {}

export class OrganizationHttpApi extends HttpApiGroup.make('organizations')
  .add(
    HttpApiEndpoint.get('list', '/organizations', {
      error: [Unauthenticated, IdentityPersistenceFailed],
      success: OrganizationListResponse,
    }),
  )
  .add(
    HttpApiEndpoint.post('create', '/organizations', {
      error: [
        Unauthenticated,
        InvalidIdentityInput,
        OrganizationSlugUnavailable,
        IdentityPersistenceFailed,
      ],
      payload: CreateOrganization,
      success: OrganizationAccess,
    }),
  ) {}

export class AppHttpApi extends HttpApi.make('app-api')
  .add(SystemHttpApi)
  .add(AuthHttpApi)
  .add(OrganizationHttpApi)
  .annotateMerge(
    OpenApi.annotations({
      description: 'Application HTTP API',
      title: 'App API',
      version: protocolVersion,
    }),
  ) {}

export const healthResponseJsonSchema = Schema.toJsonSchemaDocument(HealthResponse)
export const readinessResponseJsonSchema = Schema.toJsonSchemaDocument(ReadinessResponse)
