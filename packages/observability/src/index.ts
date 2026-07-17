import * as Layer from 'effect/Layer'
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient'
import * as OtlpLogger from 'effect/unstable/observability/OtlpLogger'
import * as OtlpSerialization from 'effect/unstable/observability/OtlpSerialization'
import * as OtlpTracer from 'effect/unstable/observability/OtlpTracer'

export type ObservabilityOptions = {
  readonly endpoint: string | undefined
  readonly serviceName: string
  readonly serviceVersion: string
}

export function makeObservabilityLayer(options: ObservabilityOptions) {
  if (options.endpoint === undefined) return Layer.empty

  const endpoint = options.endpoint.replace(/\/$/, '')
  const resource = {
    serviceName: options.serviceName,
    serviceVersion: options.serviceVersion,
  }

  return Layer.merge(
    OtlpTracer.layer({
      resource,
      url: `${endpoint}/v1/traces`,
    }),
    OtlpLogger.layer({
      resource,
      url: `${endpoint}/v1/logs`,
    }),
  ).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer))
}
