import { describe, expect, it } from 'vitest'
import { assertTestDatabase } from '../../tools/database-guard.ts'

describe('destructive fixture target guard', () => {
  it('rejects pg host/database overrides and remote or ordinary player databases', () => {
    for (const url of [
      'postgresql://u:p@localhost/idle_buds_test?host=outside.example',
      'postgresql://u:p@localhost/idle_buds_test?dbname=production',
      'postgresql://u:p@localhost/idle_buds_test?host=/var/run/postgresql',
      'postgresql://u:p@outside.example/idle_buds_test',
      'postgresql://u:p@localhost/idle_buds_dev',
      'https://localhost/idle_buds_test',
      'postgresql://u:p@localhost/idle_buds_test#ignored',
      'not-a-url',
    ]) expect(() => assertTestDatabase(url)).toThrow()
  })

  it('accepts only explicit local test database URLs', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(assertTestDatabase(`postgresql://u:p@${host}:55434/idle_buds_test`).pathname).toBe('/idle_buds_test')
    }
  })
})
