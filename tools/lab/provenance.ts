import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES_VERSION, SAVE_VERSION } from '../../src/game/limits.ts'

export const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url))

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']'
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return '{' + Object.keys(object).sort().filter(key => object[key] !== undefined)
      .map(key => JSON.stringify(key) + ':' + stableJson(object[key])).join(',') + '}'
  }
  return JSON.stringify(value) ?? 'null'
}

export function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

export interface Provenance {
  commit: string | null
  dirty: boolean
  sourceDigest: string
  contentDigest: string
  rulesVersion: number
  saveVersion: number
  nodeVersion: string
  files: string[]
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) files.push(...await sourceFiles(join(directory, entry.name)))
    else if (entry.isFile() && /\.(ts|mjs|json)$/.test(entry.name)) files.push(join(directory, entry.name))
  }
  return files
}

/** Hash actual runtime inputs, including uncommitted code; commit metadata alone is insufficient. */
export async function captureProvenance(): Promise<Provenance> {
  const files = [
    ...await sourceFiles(join(REPOSITORY_ROOT, 'src/game')),
    ...await sourceFiles(join(REPOSITORY_ROOT, 'src/data')),
    ...await sourceFiles(join(REPOSITORY_ROOT, 'server')),
    ...await sourceFiles(join(REPOSITORY_ROOT, 'tools/lab')),
    ...['tools/fixtures.ts', 'tools/player-client.ts', 'tools/mcp.ts', 'tools/mcp-schemas.ts', 'tools/lab.ts', 'package.json', 'package-lock.json'].map(path => join(REPOSITORY_ROOT, path)),
  ].sort()
  const records = await Promise.all(files.map(async path => [relative(REPOSITORY_ROOT, path).replaceAll('\\', '/'),
    createHash('sha256').update(await readFile(path)).digest('hex')]))
  let commit: string | null = null
  let dirty = true
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPOSITORY_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    dirty = execFileSync('git', ['status', '--porcelain'], { cwd: REPOSITORY_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0
  } catch { /* Source archives remain reproducible through their byte digest. */ }
  return {
    commit, dirty, sourceDigest: digest(records), contentDigest: digest(records.filter(([path]) => path.startsWith('src/data/'))),
    rulesVersion: RULES_VERSION, saveVersion: SAVE_VERSION, nodeVersion: process.version, files: records.map(([path]) => path),
  }
}
