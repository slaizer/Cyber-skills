/**
 * Option resolution for the dsh-rea bundle: plugin config, environment
 * overrides, and location discovery for the REA checkout.
 *
 * Discovery order for the REA checkout (first existing wins):
 *   1. `cliPath` / `DSH_REA_CLI`            — an explicit entry point
 *   2. `repoPath` / `DSH_REA_REPO`          — an explicit checkout
 *   3. `<plugin>/../../rea`                 — sibling of the plugin's source root
 *   4. `<plugin>/../rea`
 * No absolute path is hard-coded, so a `link:` install of this plugin keeps
 * working when the workspace moves.
 *
 * @module dsh-rea/lib/options
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path of this plugin's own directory. */
export const PLUGIN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Documented defaults; every key is overridable by config or environment. */
export const DEFAULTS = {
  repoPath: '',
  cliPath: '',
  skillsDirs: [],
  npxPackage: 'rea-agents',
  npxVersion: '',
  timeoutMs: 600_000,
  maxOutputBytes: 256 * 1024,
}

/** Environment overrides, applied over the config file/patch layer. */
const ENVIRONMENT = {
  repoPath: 'DSH_REA_REPO',
  cliPath: 'DSH_REA_CLI',
  npxPackage: 'DSH_REA_NPX_PACKAGE',
  npxVersion: 'DSH_REA_NPX_VERSION',
  timeoutMs: 'DSH_REA_TIMEOUT_MS',
  maxOutputBytes: 'DSH_REA_MAX_OUTPUT_BYTES',
}

/**
 * Merge defaults, plugin config, and environment into one resolved option set.
 * @param {Record<string, unknown>} config - the `config:` object from the loader entry.
 * @returns {typeof DEFAULTS & { pluginDir: string, repoCandidates: string[], spillDir: string }} resolved options.
 */
export function resolveOptions(config = {}) {
  const merged = { ...DEFAULTS }
  for (const key of Object.keys(DEFAULTS)) {
    if (config[key] !== undefined && config[key] !== null) merged[key] = config[key]
  }
  for (const [key, variable] of Object.entries(ENVIRONMENT)) {
    const value = process.env[variable]
    if (value !== undefined && value !== '') merged[key] = value
  }

  merged.timeoutMs = positiveInteger(merged.timeoutMs, DEFAULTS.timeoutMs)
  merged.maxOutputBytes = positiveInteger(merged.maxOutputBytes, DEFAULTS.maxOutputBytes)
  merged.skillsDirs = Array.isArray(merged.skillsDirs)
    ? merged.skillsDirs.filter(entry => typeof entry === 'string' && entry.trim() !== '')
    : []
  merged.cliPath = stringOrEmpty(merged.cliPath)
  merged.npxPackage = stringOrEmpty(merged.npxPackage) || DEFAULTS.npxPackage
  merged.npxVersion = stringOrEmpty(merged.npxVersion)

  const repoCandidates = []
  const explicitRepo = stringOrEmpty(merged.repoPath)
  if (explicitRepo !== '') repoCandidates.push(resolve(explicitRepo))
  repoCandidates.push(resolve(PLUGIN_DIR, '..', '..', 'rea'))
  repoCandidates.push(resolve(PLUGIN_DIR, '..', 'rea'))
  merged.repoCandidates = [...new Set(repoCandidates)]
  merged.repoPath = explicitRepo

  const home = process.env.DSH_HOME && process.env.DSH_HOME !== '' ? process.env.DSH_HOME : join(homedir(), '.dsh')
  merged.spillDir = join(home, 'dsh-rea', 'spill')
  merged.pluginDir = PLUGIN_DIR

  if (merged.npxVersion === '') merged.npxVersion = repoVersion(repoCandidates) ?? 'latest'
  return merged
}

/** Read the version of the first checkout that exposes a package.json. */
function repoVersion(candidates) {
  for (const candidate of candidates) {
    try {
      const manifest = JSON.parse(readFileSync(join(candidate, 'package.json'), 'utf8'))
      if (typeof manifest.version === 'string' && manifest.version !== '') return manifest.version
    } catch {
      // Missing or malformed manifest: try the next candidate.
    }
  }
  return undefined
}

/** Report which checkout candidates exist and whether each is built. */
export function inspectRepoCandidates(options) {
  return options.repoCandidates.map(repoPath => {
    const built = existsSync(join(repoPath, 'dist', 'cli.js'))
    const entry = join(repoPath, 'scripts', 'rea.mjs')
    return {
      repoPath,
      exists: existsSync(repoPath),
      built,
      entryExists: existsSync(entry),
    }
  })
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function positiveInteger(value, fallback) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}