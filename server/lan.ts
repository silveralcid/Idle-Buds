import { isIPv4 } from 'node:net'
import { networkInterfaces } from 'node:os'
import type { Pool } from 'pg'

export const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]'])

export function isPrivateIPv4(address: string): boolean {
  if (!isIPv4(address)) return false
  const [a, b] = address.split('.').map(Number)
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

export function lanAddresses(): string[] {
  const addresses = new Set<string>()
  for (const [name, interfaces] of Object.entries(networkInterfaces())) {
    // Common VPN, container and virtual adapters are not home-LAN candidates.
    if (/tailscale|wireguard|zerotier|openvpn|^tun\d|^tap\d|^utun|^docker|^veth|^virbr|^br-|vethernet|virtualbox|vmware|loopback/i.test(name)) continue
    for (const info of interfaces ?? []) {
      if (info.family === 'IPv4' && !info.internal && isPrivateIPv4(info.address)) addresses.add(info.address)
    }
  }
  return [...addresses]
}

export function localOrigins(port: number): string[] {
  return [`http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://[::1]:${port}`,
    'http://127.0.0.1:5173', 'http://localhost:5173']
}

export function assertLanDatabaseUrl(value: string): void {
  const url = new URL(value)
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !LOOPBACK.has(url.hostname)
    || url.search || url.hash || decodeURIComponent(url.pathname).toLowerCase() === '/idle_buds_test') {
    throw new Error('LAN play requires a loopback development PostgreSQL URL, not the disposable fixture database or connection overrides.')
  }
}

export async function assertLanDatabase(pool: Pool): Promise<void> {
  const { rows: [database] } = await pool.query<{ name: string; listen_addresses: string }>(
    "SELECT current_database() AS name, current_setting('listen_addresses') AS listen_addresses",
  )
  if (database.name.toLowerCase() === 'idle_buds_test') throw new Error('LAN play cannot expose the disposable playtest database.')
  const listeners = database.listen_addresses.split(',').map((address) => address.trim())
  if (listeners.some((address) => !['localhost', '127.0.0.1', '::1'].includes(address))) {
    throw new Error('LAN play requires PostgreSQL listen_addresses to contain only loopback addresses. Keep database access local.')
  }
}
