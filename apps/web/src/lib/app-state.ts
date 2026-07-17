import { AppRpcClient, makeBrowserRpcClientLayer } from '@app/client'
import { OrganizationAccess } from '@app/domain'
import type { InvitationId, OrganizationMember, Session, User } from '@app/domain'
import {
  AcceptEmailInvitation,
  AppHttpApi,
  ChangeMembershipRole,
  ChangeMembershipStatus,
  CreateEmailInvitation,
  CreateOrganization,
  ListOrganizationMembers,
  LoginWithEmail,
  RegisterWithEmail,
  RemoveOrganizationMember,
  RevokeEmailInvitation,
  TransferOrganizationOwnership,
} from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient'
import * as Atom from 'effect/unstable/reactivity/Atom'
import * as AtomHttpApi from 'effect/unstable/reactivity/AtomHttpApi'

interface LoginInput {
  readonly email: string
  readonly invitationToken: Option.Option<string>
  readonly password: string
}
interface RegisterInput extends LoginInput {
  readonly displayName: string
}
interface CreateOrganizationInput {
  readonly displayName: string
  readonly slug: string
}

export type IdentityStatus = 'authenticated' | 'checking' | 'unauthenticated' | 'unavailable'
export const identityStatusAtom = Atom.make<IdentityStatus>('checking')
export const currentUserAtom = Atom.make<Option.Option<User>>(Option.none())
export const currentSessionAtom = Atom.make<Option.Option<Session>>(Option.none())
export const organizationAccessesAtom = Atom.make<ReadonlyArray<OrganizationAccess>>([])
export const organizationMembersAtom = Atom.make<ReadonlyArray<OrganizationMember>>([])
export const activeOrganizationIdAtom = Atom.make<Option.Option<string>>(Option.none())
export const invitationReadyAtom = Atom.make<
  Option.Option<{
    readonly invitationId: InvitationId
    readonly link: string
    readonly organizationId: OrganizationAccess['organization']['id']
  }>
>(Option.none())
const sessionEpochAtom = Atom.make(0)

function defaultRpcUrl() {
  if (typeof window === 'undefined') return 'ws://127.0.0.1:3000/api/rpc'
  const url = new URL('/api/rpc', window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

function defaultApiUrl() {
  if (typeof window === 'undefined') return 'http://127.0.0.1:4100/'
  return new URL('/api/', window.location.href).toString()
}

const AppHttpAtomClient = AtomHttpApi.Service()('@app/web/AppHttpAtomClient', {
  api: AppHttpApi,
  baseUrl: import.meta.env.VITE_APP_API_URL || defaultApiUrl(),
  httpClient: FetchHttpClient.layer,
})
const rpcRuntime = Atom.runtime((get) => {
  get(sessionEpochAtom)
  return makeBrowserRpcClientLayer(import.meta.env.VITE_APP_RPC_URL || defaultRpcUrl())
})

const sessionRequestAtom = AppHttpAtomClient.mutation('auth', 'session')
const registerRequestAtom = AppHttpAtomClient.mutation('auth', 'register')
const loginRequestAtom = AppHttpAtomClient.mutation('auth', 'login')
const logoutRequestAtom = AppHttpAtomClient.mutation('auth', 'logout')
const loadOrganizationsRequestAtom = rpcRuntime.fn<void>()(
  Effect.fn('organization.list.atom')(function* () {
    const client = yield* AppRpcClient
    return yield* client['organization.list']()
  }),
)
const acceptInvitationRequestAtom = rpcRuntime.fn<string>()(
  Effect.fn('invitation.acceptEmail.atom')(function* (token) {
    const client = yield* AppRpcClient
    return yield* client['invitation.acceptEmail'](AcceptEmailInvitation.make({ token }))
  }),
)
const createOrganizationRequestAtom = rpcRuntime.fn<CreateOrganizationInput>()(
  Effect.fn('organization.create.atom')(function* (input) {
    const client = yield* AppRpcClient
    return yield* client['organization.create'](CreateOrganization.make(input))
  }),
)
const inviteMemberRequestAtom = rpcRuntime.fn<{
  readonly email: string
  readonly organizationId: OrganizationAccess['organization']['id']
  readonly role: 'admin' | 'member'
}>()(
  Effect.fn('invitation.createEmail.atom')(function* (input) {
    const client = yield* AppRpcClient
    return yield* client['invitation.createEmail'](CreateEmailInvitation.make(input))
  }),
)
const revokeInvitationRequestAtom = rpcRuntime.fn<{
  readonly invitationId: InvitationId
  readonly organizationId: OrganizationAccess['organization']['id']
}>()(
  Effect.fn('invitation.revoke.atom')(function* (input) {
    const client = yield* AppRpcClient
    return yield* client['invitation.revoke'](RevokeEmailInvitation.make(input))
  }),
)
const loadMembersRequestAtom = rpcRuntime.fn<OrganizationAccess['organization']['id']>()(
  Effect.fn('membership.list.atom')(function* (organizationId) {
    const client = yield* AppRpcClient
    return yield* client['membership.list'](ListOrganizationMembers.make({ organizationId }))
  }),
)
const changeMemberRoleRequestAtom = rpcRuntime.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
  readonly role: 'admin' | 'member'
}>()(
  Effect.fn('membership.changeRole.atom')(function* (input) {
    const client = yield* AppRpcClient
    return yield* client['membership.changeRole'](ChangeMembershipRole.make(input))
  }),
)
const changeMemberStatusRequestAtom = rpcRuntime.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
  readonly status: 'active' | 'suspended'
}>()(
  Effect.fn('membership.changeStatus.atom')(function* (input) {
    const client = yield* AppRpcClient
    return yield* client['membership.changeStatus'](ChangeMembershipStatus.make(input))
  }),
)
const removeMemberRequestAtom = rpcRuntime.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
}>()(
  Effect.fn('membership.remove.atom')(function* (input) {
    const client = yield* AppRpcClient
    return yield* client['membership.remove'](RemoveOrganizationMember.make(input))
  }),
)
const transferOwnershipRequestAtom = rpcRuntime.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
}>()(
  Effect.fn('organization.transferOwnership.atom')(function* (input) {
    const client = yield* AppRpcClient
    return yield* client['organization.transferOwnership'](
      TransferOrganizationOwnership.make(input),
    )
  }),
)

export const checkReadinessAtom = AppHttpAtomClient.query('system', 'readiness', {})

export const loadOrganizationsAtom = Atom.fn<void>()(
  Effect.fn('organization.list.flow')(function* (_, get) {
    const response = yield* get.setResult(loadOrganizationsRequestAtom, undefined)
    get.set(organizationAccessesAtom, response.organizations)
    const activeId = get(activeOrganizationIdAtom)
    if (
      !Option.exists(activeId, (id) =>
        response.organizations.some((access) => access.organization.id === id),
      )
    ) {
      get.set(organizationMembersAtom, [])
      get.set(
        activeOrganizationIdAtom,
        Option.fromNullishOr(response.organizations[0]).pipe(
          Option.map((access) => access.organization.id),
        ),
      )
    }
    return response
  }),
)

export const acceptInvitationAtom = Atom.fn<string>()(
  Effect.fn('invitation.acceptEmail.flow')(function* (token, get) {
    const access = yield* get.setResult(acceptInvitationRequestAtom, token)
    if (
      !get(organizationAccessesAtom).some((item) => item.organization.id === access.organization.id)
    )
      get.set(organizationAccessesAtom, [...get(organizationAccessesAtom), access])
    get.set(activeOrganizationIdAtom, Option.some(access.organization.id))
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('invite')
      window.history.replaceState({}, '', url)
    }
    return access
  }),
)

export const loadIdentityAtom = Atom.make((get) =>
  Effect.gen(function* () {
    get.set(identityStatusAtom, 'checking')
    const session = yield* get.setResult(sessionRequestAtom, {}).pipe(
      Effect.tapErrorTag('Unauthenticated', () =>
        Effect.sync(() => get.set(identityStatusAtom, 'unauthenticated')),
      ),
      Effect.tapCause(() =>
        Effect.sync(() => {
          if (get(identityStatusAtom) === 'checking') get.set(identityStatusAtom, 'unavailable')
        }),
      ),
    )
    get.set(currentUserAtom, Option.some(session.user))
    get.set(currentSessionAtom, Option.some(session.session))
    get.set(identityStatusAtom, 'authenticated')
    const invitationToken =
      typeof window === 'undefined'
        ? Option.none()
        : Option.fromNullishOr(new URL(window.location.href).searchParams.get('invite'))
    yield* Option.match(invitationToken, {
      onNone: () => Effect.void,
      onSome: (token) => get.setResult(acceptInvitationAtom, token),
    })
    return yield* get.setResult(loadOrganizationsAtom, undefined)
  }),
)

export const registerAtom = Atom.fn<RegisterInput>()(
  Effect.fn('auth.register.flow')(function* (input, get) {
    const session = yield* get.setResult(registerRequestAtom, {
      payload: RegisterWithEmail.make({
        displayName: input.displayName,
        email: input.email,
        password: input.password,
      }),
    })
    get.set(sessionEpochAtom, get(sessionEpochAtom) + 1)
    get.set(currentUserAtom, Option.some(session.user))
    get.set(currentSessionAtom, Option.some(session.session))
    get.set(identityStatusAtom, 'authenticated')
    yield* Option.match(input.invitationToken, {
      onNone: () => Effect.void,
      onSome: (token) => get.setResult(acceptInvitationAtom, token),
    })
    yield* get.setResult(loadOrganizationsAtom, undefined)
    return session
  }),
)

export const loginAtom = Atom.fn<LoginInput>()(
  Effect.fn('auth.login.flow')(function* (input, get) {
    const session = yield* get.setResult(loginRequestAtom, {
      payload: LoginWithEmail.make({ email: input.email, password: input.password }),
    })
    get.set(sessionEpochAtom, get(sessionEpochAtom) + 1)
    get.set(currentUserAtom, Option.some(session.user))
    get.set(currentSessionAtom, Option.some(session.session))
    get.set(identityStatusAtom, 'authenticated')
    yield* Option.match(input.invitationToken, {
      onNone: () => Effect.void,
      onSome: (token) => get.setResult(acceptInvitationAtom, token),
    })
    yield* get.setResult(loadOrganizationsAtom, undefined)
    return session
  }),
)

export const logoutAtom = Atom.fn<void>()(
  Effect.fn('auth.logout.flow')(function* (_, get) {
    const response = yield* get.setResult(logoutRequestAtom, {})
    get.set(sessionEpochAtom, get(sessionEpochAtom) + 1)
    get.set(currentUserAtom, Option.none())
    get.set(currentSessionAtom, Option.none())
    get.set(organizationAccessesAtom, [])
    get.set(organizationMembersAtom, [])
    get.set(activeOrganizationIdAtom, Option.none())
    get.set(identityStatusAtom, 'unauthenticated')
    return response
  }),
)

export const createOrganizationAtom = Atom.fn<CreateOrganizationInput>()(
  Effect.fn('organization.create.flow')(function* (input, get) {
    const access = yield* get.setResult(createOrganizationRequestAtom, input)
    get.set(organizationAccessesAtom, [...get(organizationAccessesAtom), access])
    get.set(activeOrganizationIdAtom, Option.some(access.organization.id))
    return access
  }),
)
export const selectOrganizationAtom = Atom.fn<string>()(
  Effect.fn('organization.select.flow')((id, get) =>
    Effect.sync(() => {
      get.set(organizationMembersAtom, [])
      get.set(activeOrganizationIdAtom, Option.some(id))
    }),
  ),
)
export const inviteMemberAtom = Atom.fn<{
  readonly email: string
  readonly organizationId: OrganizationAccess['organization']['id']
  readonly role: 'admin' | 'member'
}>()(
  Effect.fn('invitation.createEmail.flow')(function* (input, get) {
    const created = yield* get.setResult(inviteMemberRequestAtom, input)
    if (typeof window !== 'undefined')
      get.set(
        invitationReadyAtom,
        Option.some({
          invitationId: created.invitation.id,
          link: new URL(
            `/?invite=${encodeURIComponent(created.token)}`,
            window.location.origin,
          ).toString(),
          organizationId: created.invitation.organizationId,
        }),
      )
    return created
  }),
)
export const revokeInvitationAtom = Atom.fn<{
  readonly invitationId: InvitationId
  readonly organizationId: OrganizationAccess['organization']['id']
}>()(
  Effect.fn('invitation.revoke.flow')(function* (input, get) {
    const result = yield* get.setResult(revokeInvitationRequestAtom, input)
    get.set(invitationReadyAtom, Option.none())
    return result
  }),
)
export const loadMembersAtom = Atom.fn<OrganizationAccess['organization']['id']>()(
  Effect.fn('membership.list.flow')(function* (organizationId, get) {
    const response = yield* get.setResult(loadMembersRequestAtom, organizationId)
    get.set(organizationMembersAtom, response.members)
    return response
  }),
)
export const changeMemberRoleAtom = Atom.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
  readonly role: 'admin' | 'member'
}>()(
  Effect.fn('membership.changeRole.flow')(function* (input, get) {
    const member = yield* get.setResult(changeMemberRoleRequestAtom, input)
    yield* get.setResult(loadMembersAtom, input.organizationId)
    return member
  }),
)
export const changeMemberStatusAtom = Atom.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
  readonly status: 'active' | 'suspended'
}>()(
  Effect.fn('membership.changeStatus.flow')(function* (input, get) {
    const member = yield* get.setResult(changeMemberStatusRequestAtom, input)
    yield* get.setResult(loadMembersAtom, input.organizationId)
    return member
  }),
)
export const removeMemberAtom = Atom.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
}>()(
  Effect.fn('membership.remove.flow')(function* (input, get) {
    const member = yield* get.setResult(removeMemberRequestAtom, input)
    yield* get.setResult(loadMembersAtom, input.organizationId)
    return member
  }),
)
export const transferOwnershipAtom = Atom.fn<{
  readonly membershipId: string
  readonly organizationId: OrganizationAccess['organization']['id']
}>()(
  Effect.fn('organization.transferOwnership.flow')(function* (input, get) {
    const member = yield* get.setResult(transferOwnershipRequestAtom, input)
    yield* get.setResult(loadOrganizationsAtom, undefined)
    yield* get.setResult(loadMembersAtom, input.organizationId)
    return member
  }),
)
