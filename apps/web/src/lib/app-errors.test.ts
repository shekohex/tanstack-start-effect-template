import { assert, it } from '@effect/vitest'
import {
  AuthenticationFailed,
  EmailAlreadyRegistered,
  OrganizationSlugUnavailable,
} from '@app/protocol'

import { appOperationErrorMessage } from './app-errors.js'

it('maps typed protocol errors to actionable UI messages', () => {
  assert.strictEqual(
    appOperationErrorMessage(EmailAlreadyRegistered.make({ message: 'duplicate' })),
    'This email is already registered.',
  )
  assert.strictEqual(
    appOperationErrorMessage(AuthenticationFailed.make({ message: 'invalid' })),
    'Email or password is incorrect.',
  )
  assert.strictEqual(
    appOperationErrorMessage(OrganizationSlugUnavailable.make({ slug: 'taken' })),
    'That organization URL is already in use.',
  )
})
