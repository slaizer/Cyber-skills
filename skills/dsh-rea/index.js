/**
 * dsh-rea bundle entry.
 *
 * Mounts two capabilities for every session of the profile:
 *
 *   1. `ctx.skills` — the packaged `reverse-engineer-anything` skill, so each
 *      session's skill catalog routes shipped-artifact and decompilation work
 *      to REA instead of guessing.
 *   2. `ctx.tools`  — `rea` (run one REA CLI invocation) and `rea_doctor`
 *      (resolve the runtime and report readiness), so the knowledge is callable
 *      even when no REA MCP server is registered for this client.
 *
 * The bundle has no runtime dependencies: it only reads its packaged skills and
 * spawns the resolved REA entry point. The REA checkout itself is discovered,
 * never modified, and never installed.
 *
 * @module dsh-rea
 */

import { resolveOptions } from './lib/options.js'
import { createRuntime } from './lib/runtime.js'
import { assertPackagedSkills, createSkillProvider } from './lib/skills.js'
import { registerReaTools } from './lib/tools.js'

export const name = 'dsh-rea'
export const inject = ['skills', 'tools']

/**
 * Mount the REA skill and tools.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the plugin context.
 * @param {Record<string, unknown>} [config] - loader-entry `config:` overrides.
 */
export function apply(ctx, config = {}) {
  const options = resolveOptions(config)

  // Fail loudly at mount rather than serving an empty catalog later.
  const skillNames = assertPackagedSkills(options)

  const provider = createSkillProvider(options)
  ctx.skills.registerProvider(() => provider)

  const runtime = createRuntime(options)
  registerReaTools(ctx, { runtime, options })

  reportMount(ctx, options, skillNames, runtime)
}

/** Best-effort mount note; logging must never break the mount itself. */
function reportMount(ctx, options, skillNames, runtime) {
  try {
    const logger = ctx.logger
    if (typeof logger?.info !== 'function') return
    const probe = runtime.describe()
    const built = probe.candidates.filter(candidate => candidate.built).map(candidate => candidate.repoPath)
    logger.info(
      `dsh-rea: skills=${skillNames.join(',')} tools=rea,rea_doctor ` +
        `checkout=${built[0] ?? 'none'} npx=${probe.npxPackage}@${probe.npxVersion}`,
    )
  } catch {
    // A logger that is absent or shaped differently is not a mount failure.
  }
}