export { assertTestDatabase } from './database-guard.ts'

export function localDatabase(options?: { temporary?: boolean; playtest?: boolean }): Promise<{
  url: string
  directory: string
  dataPath: string
  shutdown(): Promise<void>
  restart(): Promise<void>
  stop(): Promise<void>
}>
export function migrate(databaseUrl: string): Promise<void>
export function databaseVersion(databaseUrl: string): Promise<string>
