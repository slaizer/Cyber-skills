/**
 * Packaged skill provider for the dsh-rea bundle.
 *
 * The bundle ships `skills/<name>/SKILL.md` bundles and re-reads them from disk
 * on every discovery, so editing a skill body takes effect without restarting
 * the harness. Roots are scanned in order and de-duplicated by skill name:
 *
 *   1. `config.skillsDirs`      — operator-supplied roots, highest priority
 *   2. `<plugin>/skills`        — the packaged REA skill
 *
 * @module dsh-rea/lib/skills
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Same rank as packaged dsh skill providers (`BUNDLED_SKILL_RANK`). */
const BUNDLED_SKILL_RANK = 600
const PROVIDER_NAME = 'dsh-rea'
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Build the one provider this bundle registers on `ctx.skills`.
 * @param {{ pluginDir: string, skillsDirs: string[] }} options - resolved options.
 * @returns {import('@deepseek-ai/dsh-skill').SkillProvider} the REA skill provider.
 */
export function createSkillProvider(options) {
  const roots = [...options.skillsDirs, join(options.pluginDir, 'skills')]

  return {
    name: PROVIDER_NAME,
    async list(lookup) {
      lookup?.signal?.throwIfAborted()
      const skills = await loadSkills(roots, lookup?.signal)
      return skills.map(toCandidate)
    },
    async get(candidate, lookup) {
      lookup?.signal?.throwIfAborted()
      const skills = await loadSkills(roots, lookup?.signal)
      const skill = skills.find(entry => entry.name === candidate.name)
      lookup?.signal?.throwIfAborted()
      return skill === undefined ? undefined : toDefinition(skill)
    },
  }
}

/**
 * Validate the packaged skill bundles synchronously at mount time.
 *
 * Registering a provider that later serves an empty catalog would be silent
 * data loss, so a missing root, a missing SKILL.md, or invalid frontmatter
 * fails the mount instead.
 * @param {{ pluginDir: string }} options - resolved options.
 * @returns {string[]} the packaged skill names.
 */
export function assertPackagedSkills(options) {
  const root = join(options.pluginDir, 'skills')
  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    throw new Error(`dsh-rea: packaged skill root is missing: ${root}`)
  }

  const names = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const file = join(root, entry.name, 'SKILL.md')
    if (!existsSync(file)) continue
    const parsed = parseSkillDocument(readFileSync(file, 'utf8'), file)
    if (parsed === undefined) throw new Error(`dsh-rea: ${file} is not a skill bundle (missing frontmatter)`)
    names.push(parsed.name)
  }
  if (names.length === 0) throw new Error(`dsh-rea: no SKILL.md bundles found under ${root}`)
  return names
}

/** Load every root in priority order; the first root that defines a name wins. */
export async function loadSkills(roots, signal) {
  const byName = new Map()
  for (const root of roots) {
    signal?.throwIfAborted()
    for (const skill of await loadRoot(root, signal)) {
      if (!byName.has(skill.name)) byName.set(skill.name, skill)
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name))
}

/** Read one root's directory bundles and flat `*.md` skills. */
async function loadRoot(root, signal) {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    // An absent optional root is not an error.
    return []
  }

  const skills = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    signal?.throwIfAborted()
    if (entry.isDirectory()) {
      const file = join(root, entry.name, 'SKILL.md')
      const skill = await readSkill(file, join(root, entry.name), signal)
      if (skill !== undefined) skills.push(skill)
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'SKILL.md') continue
    const skill = await readSkill(join(root, entry.name), root, signal)
    if (skill !== undefined) skills.push(skill)
  }
  return skills
}

async function readSkill(file, directory, signal) {
  let raw
  try {
    raw = await readFile(file, 'utf8')
  } catch {
    return undefined
  }
  signal?.throwIfAborted()
  const parsed = parseSkillDocument(raw)
  if (parsed === undefined) return undefined
  return { ...parsed, file, directory, content: stripFrontmatter(raw).trim() }
}

/**
 * Parse the frontmatter of one skill document.
 *
 * Only the top-level scalar keys this provider needs are read; a nested block
 * (such as REA's `metadata:` map) is collected into `metadata`. Returning
 * `undefined` means "not a skill bundle", while a bundle with an invalid name or
 * a missing description throws, because silently dropping a shipped skill is
 * worse than failing at mount time.
 * @param {string} raw - the SKILL.md contents.
 * @param {string} [file] - path used in error messages.
 * @returns {{ name: string, description: string, invocation: { modelInvocable: boolean, userInvocable: boolean }, metadata?: Record<string, unknown> } | undefined}
 */
export function parseSkillDocument(raw, file = 'SKILL.md') {
  const head = frontmatterBlock(raw)
  if (head === undefined) return undefined

  const scalars = new Map()
  const metadata = {}
  let nestedKey

  for (const rawLine of head.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (line.trim() === '' || line.trim() === '---') continue
    const indented = /^[ \t]/.test(line)
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    const value = stripComment(line.slice(colon + 1).trim())
    if (key === '') continue

    if (indented) {
      if (nestedKey === 'metadata') metadata[key] = scalar(value)
      continue
    }
    nestedKey = value === '' ? key : undefined
    if (value !== '') scalars.set(key, scalar(value))
  }

  const name = typeof scalars.get('name') === 'string' ? scalars.get('name') : ''
  const description = typeof scalars.get('description') === 'string' ? scalars.get('description') : ''
  if (name === '' && description === '') return undefined
  if (!SKILL_NAME.test(name)) {
    throw new Error(`dsh-rea: ${file} has an invalid skill name (expected kebab-case): ${JSON.stringify(name)}`)
  }
  if (description === '') throw new Error(`dsh-rea: ${file} frontmatter requires a description`)
  if (/\n/.test(description)) throw new Error(`dsh-rea: ${file} frontmatter description must be a single line`)

  return {
    name,
    description,
    invocation: {
      modelInvocable: scalars.get('disable-model-invocation') !== true,
      userInvocable: scalars.get('user-invocable') !== false,
    },
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }
}

function toCandidate(skill) {
  return {
    name: skill.name,
    description: skill.description,
    invocation: skill.invocation,
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase: { kind: 'directory', path: skill.directory },
    rank: BUNDLED_SKILL_RANK,
    locator: skill.file,
    path: skill.file,
    metadata: skill.metadata,
  }
}

function toDefinition(skill) {
  return {
    name: skill.name,
    description: skill.description,
    invocation: skill.invocation,
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase: { kind: 'directory', path: skill.directory },
    path: skill.file,
    content: skill.content,
    metadata: skill.metadata,
  }
}

function scalar(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  const quoted = /^".*"$/.test(value) || /^'.*'$/.test(value)
  if (quoted) {
    const inner = value.slice(1, -1)
    return value.startsWith('"') ? inner.replace(/\\"/g, '"') : inner.replace(/''/g, "'")
  }
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10)
  return value
}

function stripComment(value) {
  // A quoted scalar owns its contents: `#` inside quotes is data, not a comment.
  for (const quote of ['"', "'"]) {
    if (value.startsWith(quote)) {
      const end = value.indexOf(quote, 1)
      return end < 0 ? value : value.slice(0, end + 1)
    }
  }
  const marker = value.indexOf(' #')
  return marker < 0 ? value : value.slice(0, marker).trim()
}

/** Return the frontmatter block body, or undefined when the file is not a skill bundle. */
function frontmatterBlock(raw) {
  const text = raw.replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) return undefined
  const afterOpen = text.slice(3)
  if (!/^\r?\n/.test(afterOpen)) return undefined
  const rest = afterOpen.replace(/^\r?\n/, '')
  const close = rest.match(/\r?\n---(?:\r?\n|$)/)
  if (close?.index === undefined) return undefined
  return rest.slice(0, close.index)
}

/** Strip the leading frontmatter block, returning the Markdown body. */
export function stripFrontmatter(raw) {
  const head = frontmatterBlock(raw)
  if (head === undefined) return raw
  // "---\n" is four characters; head starts right after it.
  const close = raw.indexOf('\n---', 4 + head.length)
  if (close < 0) return ''
  const body = raw.slice(close + 4)
  return body.startsWith('\n') ? body.slice(1) : body
}