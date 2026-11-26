import { describe, expect, it } from 'vitest'
import { assertLanDatabaseUrl, isPrivateIPv4, localOrigins } from '../../server/lan.ts'

describe('trusted LAN configuration', () => {
  it('accepts only RFC1918 IPv4 addresses for LAN origins', () => {
    for (const address of ['10.0.0.1', '172.16.0.1', '172.31.255.254', '192.168.1.1']) expect(isPrivateIPv4(address)).toBe(true)
    for (const address of ['127.0.0.1', '172.15.0.1', '172.32.0.1', '100.64.0.1', '169.254.1.1', '8.8.8.8', '::1', '192.168.1.999']) expect(isPrivateIPv4(address)).toBe(false)
    expect(localOrigins(3000)).toContain('http://localhost:3000')
  })

  it('rejects fixture databases, nonloopback destinations and connection overrides', () => {
    expect(() => assertLanDatabaseUrl('postgresql://user:secret@127.0.0.1:5432/idle_buds_dev')).not.toThrow()
    for (const url of [
      'postgresql://localhost/idle_buds_test',
      'postgresql://localhost/%69dle_buds_test',
      'postgresql://192.168.1.1/idle_buds_dev',
      'postgresql://localhost/idle_buds_dev?host=192.168.1.1',
      'postgresql://localhost/idle_buds_dev?dbname=idle_buds_test',
    ]) expect(() => assertLanDatabaseUrl(url)).toThrow()
  })
})
