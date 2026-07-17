export interface Clock {
  now(): Date
}

export class FakeClock implements Clock {
  readonly #instant: Date

  constructor(instant: Date | string) {
    this.#instant = new Date(instant)
  }

  now(): Date {
    return new Date(this.#instant)
  }
}

export function createIdFactory(prefix = 'test') {
  let sequence = 0

  return () => `${prefix}_${String(++sequence).padStart(4, '0')}`
}
