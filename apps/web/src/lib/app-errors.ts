import type {
  AuthenticationFailed,
  EmailAlreadyRegistered,
  IdentityPersistenceFailed,
  InvalidIdentityInput,
  InvitationAlreadyPending,
  InvitationEmailMismatch,
  InvitationUnavailable,
  MembershipNotFound,
  OrganizationSlugUnavailable,
  OwnerInvariantViolation,
  PermissionDenied,
  ProtocolError,
  Unauthenticated,
} from '@app/protocol'
import * as Match from 'effect/Match'
import type * as RpcClientError from 'effect/unstable/rpc/RpcClientError'

export type AppOperationError =
  | AuthenticationFailed
  | EmailAlreadyRegistered
  | IdentityPersistenceFailed
  | InvalidIdentityInput
  | InvitationAlreadyPending
  | InvitationEmailMismatch
  | InvitationUnavailable
  | MembershipNotFound
  | OrganizationSlugUnavailable
  | OwnerInvariantViolation
  | PermissionDenied
  | ProtocolError
  | RpcClientError.RpcClientError
  | Unauthenticated

export const appOperationErrorMessage = Match.type<AppOperationError>().pipe(
  Match.tagsExhaustive({
    AuthenticationFailed: () => 'Email or password is incorrect.',
    EmailAlreadyRegistered: () => 'This email is already registered.',
    IdentityPersistenceFailed: () => 'The application could not save this change. Try again.',
    InvalidIdentityInput: () => 'Review the submitted values and try again.',
    InvitationAlreadyPending: () => 'An invitation is already pending for this email.',
    InvitationEmailMismatch: () => 'This invitation belongs to another email address.',
    InvitationUnavailable: () => 'This invitation is invalid, expired, or already used.',
    MembershipNotFound: () => 'This membership no longer exists.',
    OrganizationSlugUnavailable: () => 'That organization URL is already in use.',
    OwnerInvariantViolation: () => 'The organization must keep an active owner.',
    PermissionDenied: () => 'You do not have permission to perform this action.',
    ProtocolError: ({ message }) => message,
    RpcClientError: () => 'The application could not complete this request.',
    Unauthenticated: () => 'Your session expired. Sign in again.',
  }),
)
