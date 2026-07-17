import * as Schema from 'effect/Schema'

export class CanonicalReference extends Schema.Class<CanonicalReference>(
  '@app/domain/CanonicalReference',
)({
  id: Schema.String,
  type: Schema.String,
}) {}

export * from './ids.js'
export * from './identity.js'
