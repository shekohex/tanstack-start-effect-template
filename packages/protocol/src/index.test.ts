import { describe, expect, it } from 'vitest'
import * as Schema from 'effect/Schema'
import * as OpenApi from 'effect/unstable/httpapi/OpenApi'

import {
  AppHttpApi,
  AppRpcs,
  HealthResponse,
  healthResponseJsonSchema,
  protocolVersion,
} from './index.js'

describe('@app/protocol', () => {
  it('publishes JSON-compatible schema contracts', () => {
    expect(protocolVersion).toMatch(/^\d+\.\d+\.\d+$/)
    expect(healthResponseJsonSchema.dialect).toBe('draft-2020-12')
    expect(JSON.stringify(healthResponseJsonSchema)).not.toContain('Effect')
    expect(
      Schema.decodeUnknownSync(HealthResponse)({
        service: 'app-api',
        status: 'ok',
        version: '0.0.0',
      }),
    ).toBeInstanceOf(HealthResponse)
  })

  it('defines the first-party RPC surface', () => {
    expect([...AppRpcs.requests.keys()]).toEqual([
      'system.health',
      'system.ping',
      'system.readiness',
      'organization.list',
      'organization.create',
      'organization.update',
      'invitation.createEmail',
      'invitation.acceptEmail',
      'invitation.revoke',
      'membership.list',
      'membership.changeRole',
      'membership.changeStatus',
      'membership.remove',
      'organization.transferOwnership',
    ])
  })

  it('preserves typed authentication HTTP statuses', () => {
    const responses = OpenApi.fromApi(AppHttpApi).paths['/auth/register']?.post?.responses
    expect(responses).toHaveProperty('400')
    expect(responses).toHaveProperty('409')
    expect(responses).toHaveProperty('500')
  })
})
