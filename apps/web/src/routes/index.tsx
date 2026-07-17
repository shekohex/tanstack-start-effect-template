import { createFileRoute } from '@tanstack/react-router'
import { useAtom, useAtomRefresh, useAtomSet, useAtomValue } from '@effect/atom-react'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AppShell,
  AuthForm,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CreateOrganizationForm,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  MembersDialog,
  OrganizationSwitcher,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StateSurface,
  ThemeSelector,
  applyColorMode,
  defaultColorMode,
  isColorMode,
  type ColorMode,
} from '@app/ui'
import { useEffect, useState, type FormEvent } from 'react'

import { appOperationErrorMessage, type AppOperationError } from '../lib/app-errors'
import {
  activeOrganizationIdAtom,
  changeMemberRoleAtom,
  changeMemberStatusAtom,
  checkReadinessAtom,
  createOrganizationAtom,
  currentUserAtom,
  identityStatusAtom,
  invitationReadyAtom,
  inviteMemberAtom,
  loadIdentityAtom,
  loadMembersAtom,
  loginAtom,
  logoutAtom,
  organizationAccessesAtom,
  organizationMembersAtom,
  registerAtom,
  removeMemberAtom,
  revokeInvitationAtom,
  selectOrganizationAtom,
  transferOwnershipAtom,
} from '../lib/app-state'

export const Route = createFileRoute('/')({ component: Home })

function resultErrorMessage<A>(
  result: AsyncResult.AsyncResult<A, AppOperationError>,
): Option.Option<string> {
  const error = AsyncResult.error(result)
  return Option.match(error, {
    onNone: () =>
      AsyncResult.isFailure(result)
        ? Option.some('The application could not complete this request.')
        : Option.none(),
    onSome: (operationError) => Option.some(appOperationErrorMessage(operationError)),
  })
}

function invitationToken(): Option.Option<string> {
  return typeof window === 'undefined'
    ? Option.none()
    : Option.fromNullishOr(new URL(window.location.href).searchParams.get('invite'))
}

function InviteDialog({
  onInvite,
  onOpenChange,
  open,
}: {
  readonly onInvite: (email: string, role: 'admin' | 'member') => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}) {
  const [role, setRole] = useState<'admin' | 'member'>('member')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = data.get('email')
    if (typeof email === 'string') onInvite(email, role)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>Create a one-time invitation link.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input id="invite-email" name="email" required type="email" />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select
                onValueChange={(value) => setRole(value === 'admin' ? 'admin' : 'member')}
                value={role}
              >
                <SelectTrigger aria-label="Invitation role" id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <DialogFooter>
              <Button type="submit">Create invitation</Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Home() {
  const identityStatus = useAtomValue(identityStatusAtom)
  const currentUser = useAtomValue(currentUserAtom)
  const accesses = useAtomValue(organizationAccessesAtom)
  const members = useAtomValue(organizationMembersAtom)
  const activeOrganizationId = useAtomValue(activeOrganizationIdAtom)
  const [readyInvitation, setReadyInvitation] = useAtom(invitationReadyAtom)
  const readiness = useAtomValue(checkReadinessAtom)
  const loadIdentityResult = useAtomValue(loadIdentityAtom)
  const registerResult = useAtomValue(registerAtom)
  const loginResult = useAtomValue(loginAtom)
  const logoutResult = useAtomValue(logoutAtom)
  const createOrganizationResult = useAtomValue(createOrganizationAtom)
  const inviteResult = useAtomValue(inviteMemberAtom)
  const membersResult = useAtomValue(loadMembersAtom)
  const changeRoleResult = useAtomValue(changeMemberRoleAtom)
  const changeStatusResult = useAtomValue(changeMemberStatusAtom)
  const removeResult = useAtomValue(removeMemberAtom)
  const transferResult = useAtomValue(transferOwnershipAtom)
  const retryIdentity = useAtomRefresh(loadIdentityAtom)
  const register = useAtomSet(registerAtom)
  const login = useAtomSet(loginAtom)
  const logout = useAtomSet(logoutAtom)
  const createOrganization = useAtomSet(createOrganizationAtom)
  const selectOrganization = useAtomSet(selectOrganizationAtom)
  const invite = useAtomSet(inviteMemberAtom)
  const revokeInvitation = useAtomSet(revokeInvitationAtom)
  const loadMembers = useAtomSet(loadMembersAtom)
  const changeRole = useAtomSet(changeMemberRoleAtom)
  const changeStatus = useAtomSet(changeMemberStatusAtom)
  const remove = useAtomSet(removeMemberAtom)
  const transferOwnership = useAtomSet(transferOwnershipAtom)
  const [membersOpen, setMembersOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [colorMode, setColorMode] = useState<ColorMode>(defaultColorMode)

  const resolvedIdentityStatus =
    identityStatus === 'authenticated' || identityStatus === 'unauthenticated'
      ? identityStatus
      : loadIdentityResult.waiting
        ? 'checking'
        : Option.exists(
              AsyncResult.error(loadIdentityResult),
              (error) => error._tag === 'Unauthenticated',
            )
          ? 'unauthenticated'
          : 'unavailable'

  const activeAccess = Option.fromNullishOr(
    accesses.find((access) =>
      Option.exists(activeOrganizationId, (id) => id === access.organization.id),
    ) ?? accesses[0],
  )
  const identityError = Option.firstSomeOf([
    resultErrorMessage(registerResult),
    resultErrorMessage(loginResult),
    resultErrorMessage(loadIdentityResult),
  ])
  const organizationError = resultErrorMessage(createOrganizationResult)
  const operationError = Option.firstSomeOf([
    resultErrorMessage(inviteResult),
    resultErrorMessage(membersResult),
    resultErrorMessage(changeRoleResult),
    resultErrorMessage(changeStatusResult),
    resultErrorMessage(removeResult),
    resultErrorMessage(transferResult),
    resultErrorMessage(logoutResult),
  ])

  useEffect(() => {
    const stored = window.localStorage.getItem('app-color-mode')
    if (isColorMode(stored)) setColorMode(stored)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyColorMode(document.documentElement, colorMode, media.matches)
    apply()
    window.localStorage.setItem('app-color-mode', colorMode)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [colorMode])

  useEffect(() => {
    Option.match(activeAccess, {
      onNone: () => undefined,
      onSome: (access) => loadMembers(access.organization.id),
    })
  }, [activeOrganizationId, accesses.length, resolvedIdentityStatus])

  if (resolvedIdentityStatus === 'checking')
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p role="status">Checking your session…</p>
      </main>
    )
  if (resolvedIdentityStatus === 'unavailable')
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <StateSurface actionLabel="Try again" onAction={retryIdentity} state="offline" />
      </main>
    )
  if (resolvedIdentityStatus === 'unauthenticated')
    return (
      <AuthForm
        error={Option.getOrUndefined(identityError)}
        onLogin={(input) => login({ ...input, invitationToken: invitationToken() })}
        onRegister={(input) => register({ ...input, invitationToken: invitationToken() })}
        pending={registerResult.waiting || loginResult.waiting}
      />
    )
  if (Option.isSome(currentUser) && accesses.length === 0)
    return (
      <CreateOrganizationForm
        error={Option.getOrUndefined(organizationError)}
        onCreate={createOrganization}
        pending={createOrganizationResult.waiting}
        userDisplayName={currentUser.value.displayName}
      />
    )

  return Option.match(activeAccess, {
    onNone: () => <StateSurface state="empty" />,
    onSome: (access) => {
      const canInvite = access.membership.role === 'owner' || access.membership.role === 'admin'
      const canManage = access.membership.role === 'owner'
      const readinessStatus = readiness.waiting
        ? 'checking'
        : AsyncResult.isSuccess(readiness)
          ? 'ready'
          : 'unavailable'
      return (
        <AppShell
          navigation={
            <nav className="flex flex-col gap-2">
              <Button className="justify-start" variant="secondary">
                Overview
              </Button>
              <Button
                className="justify-start"
                onClick={() => setMembersOpen(true)}
                variant="ghost"
              >
                Members
              </Button>
            </nav>
          }
          onSignOut={() => logout(undefined)}
          organizationSwitcher={
            <OrganizationSwitcher
              activeOrganizationId={access.organization.id}
              onSelect={selectOrganization}
              organizations={accesses.map((item) => ({
                id: item.organization.id,
                name: item.organization.displayName,
              }))}
            />
          }
          userName={Option.map(currentUser, (user) => user.displayName).pipe(Option.getOrUndefined)}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-semibold">
                  {access.organization.displayName}
                </h1>
                <p className="text-muted-foreground">/{access.organization.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={readinessStatus === 'ready' ? 'secondary' : 'destructive'}>
                  {readinessStatus}
                </Badge>
                <ThemeSelector onChange={setColorMode} value={colorMode} />
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Starter dashboard</CardTitle>
                <CardDescription>
                  Replace this example organization domain without changing auth, protocol, or
                  runtime boundaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => setMembersOpen(true)} variant="outline">
                  Manage members
                </Button>
                {canInvite ? (
                  <Button onClick={() => setInviteOpen(true)}>Invite member</Button>
                ) : null}
              </CardContent>
            </Card>
            {Option.match(operationError, {
              onNone: () => null,
              onSome: (error) => (
                <Alert variant="destructive">
                  <AlertTitle>Action failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ),
            })}
            {Option.match(readyInvitation, {
              onNone: () => null,
              onSome: (ready) => (
                <Alert>
                  <AlertTitle>Invitation ready</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3">
                    <Input aria-label="Invitation link" readOnly value={ready.link} />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => void navigator.clipboard.writeText(ready.link)}
                        size="sm"
                      >
                        Copy link
                      </Button>
                      <Button
                        onClick={() =>
                          revokeInvitation({
                            invitationId: ready.invitationId,
                            organizationId: ready.organizationId,
                          })
                        }
                        size="sm"
                        variant="destructive"
                      >
                        Revoke
                      </Button>
                      <Button
                        onClick={() => setReadyInvitation(Option.none())}
                        size="sm"
                        variant="outline"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ),
            })}
          </div>
          <InviteDialog
            onInvite={(email, role) => {
              invite({ email, organizationId: access.organization.id, role })
              setInviteOpen(false)
            }}
            onOpenChange={setInviteOpen}
            open={inviteOpen}
          />
          <MembersDialog
            members={members.map((member) => ({
              email: member.user.email,
              id: member.membership.id,
              isCurrent: Option.exists(currentUser, (user) => user.id === member.user.id),
              name: member.user.displayName,
              role: member.membership.role,
              status: member.membership.status,
            }))}
            onChangeRole={
              canManage
                ? (membershipId, role) =>
                    changeRole({ membershipId, organizationId: access.organization.id, role })
                : undefined
            }
            onChangeStatus={
              canInvite
                ? (membershipId, status) =>
                    changeStatus({ membershipId, organizationId: access.organization.id, status })
                : undefined
            }
            onInvite={canInvite ? () => setInviteOpen(true) : undefined}
            onOpenChange={setMembersOpen}
            onRemove={
              canManage
                ? (membershipId) => remove({ membershipId, organizationId: access.organization.id })
                : undefined
            }
            onTransferOwnership={
              canManage
                ? (membershipId) =>
                    transferOwnership({ membershipId, organizationId: access.organization.id })
                : undefined
            }
            open={membersOpen}
          />
        </AppShell>
      )
    },
  })
}
