import { useId, type FormEvent } from 'react'

import { Alert, AlertDescription, AlertTitle } from './alert'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from './field'
import { Input } from './input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

export type LoginIntent = { readonly email: string; readonly password: string }
export type RegistrationIntent = LoginIntent & { readonly displayName: string }

export interface AuthFormProps {
  readonly appName?: string
  readonly error?: string | undefined
  readonly onLogin: (intent: LoginIntent) => void
  readonly onRegister: (intent: RegistrationIntent) => void
  readonly pending?: boolean | undefined
}

function formString(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

export function AuthForm({
  appName = 'App',
  error,
  onLogin,
  onRegister,
  pending = false,
}: AuthFormProps) {
  const displayNameId = useId()
  const loginEmailId = useId()
  const loginPasswordId = useId()
  const registerEmailId = useId()
  const registerPasswordId = useId()

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onLogin({ email: formString(data, 'email'), password: formString(data, 'password') })
  }

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onRegister({
      displayName: formString(data, 'displayName'),
      email: formString(data, 'email'),
      password: formString(data, 'password'),
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to {appName}</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert className="mb-5" variant="destructive">
              <AlertTitle>Authentication failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Tabs defaultValue="register">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="register">Create account</TabsTrigger>
              <TabsTrigger value="login">Sign in</TabsTrigger>
            </TabsList>
            <TabsContent value="register">
              <form className="pt-5" onSubmit={submitRegistration}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={displayNameId}>Display name</FieldLabel>
                    <Input autoComplete="name" id={displayNameId} name="displayName" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={registerEmailId}>Email</FieldLabel>
                    <Input
                      autoComplete="email"
                      id={registerEmailId}
                      name="email"
                      required
                      type="email"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={registerPasswordId}>Password</FieldLabel>
                    <Input
                      autoComplete="new-password"
                      id={registerPasswordId}
                      minLength={12}
                      name="password"
                      required
                      type="password"
                    />
                    <FieldDescription>Use at least 12 characters.</FieldDescription>
                  </Field>
                  <FieldError>{error}</FieldError>
                  <Button disabled={pending} type="submit">
                    {pending ? 'Creating account…' : 'Create account'}
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
            <TabsContent value="login">
              <form className="pt-5" onSubmit={submitLogin}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={loginEmailId}>Email</FieldLabel>
                    <Input
                      autoComplete="email"
                      id={loginEmailId}
                      name="email"
                      required
                      type="email"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={loginPasswordId}>Password</FieldLabel>
                    <Input
                      autoComplete="current-password"
                      id={loginPasswordId}
                      minLength={12}
                      name="password"
                      required
                      type="password"
                    />
                  </Field>
                  <FieldError>{error}</FieldError>
                  <Button disabled={pending} type="submit">
                    {pending ? 'Signing in…' : 'Sign in'}
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
