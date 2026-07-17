import type { ReactNode } from 'react'

import { Button } from './button'
import { Separator } from './separator'

export interface AppShellProps {
  readonly appName?: string
  readonly children: ReactNode
  readonly navigation?: ReactNode
  readonly onSignOut?: (() => void) | undefined
  readonly organizationSwitcher?: ReactNode
  readonly userName?: string | undefined
}

export function AppShell({
  appName = 'App',
  children,
  navigation,
  onSignOut,
  organizationSwitcher,
  userName,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur">
        <strong className="font-heading text-base">{appName}</strong>
        <div className="min-w-0 flex-1">{organizationSwitcher}</div>
        {userName ? (
          <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
        ) : null}
        {onSignOut ? (
          <Button onClick={onSignOut} size="sm" variant="outline">
            Sign out
          </Button>
        ) : null}
      </header>
      <div className="mx-auto flex w-full max-w-7xl">
        {navigation ? (
          <aside className="hidden w-56 shrink-0 border-r p-4 md:block">{navigation}</aside>
        ) : null}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <Separator className="md:hidden" />
    </div>
  )
}
