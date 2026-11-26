export const RULES_VERSION = 1
export const SAVE_VERSION = 2
export const MAX_COINS = 1_000_000_000
export const MAX_BUDS = 100
export const MAX_EGGS = 12
export const MAX_QUEUE = 5
export const MAX_CAPTURE_RULES = 8
export const MAX_ORDER_COUNT = 10_000
export const LEARN_MIN_LEVEL = 2
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1_000
export const TENDER_ID = 'tender'

export class RuleError extends Error {}

export function requireRule(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleError(message)
}
