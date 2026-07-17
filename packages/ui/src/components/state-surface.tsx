import { Alert, AlertDescription, AlertTitle } from './alert'
import { Button } from './button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from './empty'
import { Skeleton } from './skeleton'

export type SurfaceState = 'empty' | 'error' | 'loading' | 'offline' | 'permission'

export interface StateSurfaceProps {
  readonly actionLabel?: string | undefined
  readonly description?: string | undefined
  readonly onAction?: (() => void) | undefined
  readonly state: SurfaceState
  readonly title?: string | undefined
}

export function StateSurface({
  actionLabel,
  description,
  onAction,
  state,
  title,
}: StateSurfaceProps) {
  if (state === 'loading') {
    return (
      <div aria-label="Loading" className="flex flex-col gap-3" role="status">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (state === 'error' || state === 'offline') {
    return (
      <Alert variant="destructive">
        <AlertTitle>
          {title ?? (state === 'offline' ? 'Connection unavailable' : 'Something went wrong')}
        </AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          {description ?? 'Try again or contact support if the problem continues.'}
          {actionLabel && onAction ? (
            <Button onClick={onAction} variant="outline">
              {actionLabel}
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          {title ?? (state === 'permission' ? 'Access required' : 'Nothing here yet')}
        </EmptyTitle>
        <EmptyDescription>
          {description ??
            (state === 'permission'
              ? 'Your role does not allow this action.'
              : 'Create the first item to get started.')}
        </EmptyDescription>
      </EmptyHeader>
      {actionLabel && onAction ? (
        <EmptyContent>
          <Button onClick={onAction}>{actionLabel}</Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
