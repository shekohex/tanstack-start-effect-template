import { useId, useState, type FormEvent } from 'react'

import { Alert, AlertDescription, AlertTitle } from './alert'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from './field'
import { Input } from './input'

export type CreateOrganizationIntent = { readonly displayName: string; readonly slug: string }

export interface CreateOrganizationFormProps {
  readonly error?: string | undefined
  readonly onCreate: (intent: CreateOrganizationIntent) => void
  readonly pending?: boolean | undefined
  readonly userDisplayName: string
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function CreateOrganizationForm({
  error,
  onCreate,
  pending = false,
  userDisplayName,
}: CreateOrganizationFormProps) {
  const displayNameId = useId()
  const slugId = useId()
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onCreate({ displayName, slug })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create your first organization</CardTitle>
          <CardDescription>Welcome, {userDisplayName}. You will become its owner.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert className="mb-5" variant="destructive">
              <AlertTitle>Organization creation failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={displayNameId}>Organization name</FieldLabel>
                <Input
                  id={displayNameId}
                  onChange={(event) => {
                    const nextName = event.target.value
                    setDisplayName(nextName)
                    if (!slugEdited) setSlug(slugify(nextName))
                  }}
                  required
                  value={displayName}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={slugId}>Organization URL</FieldLabel>
                <Input
                  id={slugId}
                  onChange={(event) => {
                    setSlugEdited(true)
                    setSlug(slugify(event.target.value))
                  }}
                  pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
                  required
                  value={slug}
                />
                <FieldDescription>Used in links and API identifiers.</FieldDescription>
              </Field>
              <Button disabled={pending} type="submit">
                {pending ? 'Creating organization…' : 'Create organization'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
