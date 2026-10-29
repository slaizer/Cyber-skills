/**
 * The two model-facing tools this bundle registers: `rea` (run one REA CLI
 * invocation) and `rea_doctor` (resolve the runtime and report readiness).
 *
 * Tool definitions are plain objects because the bundle stays dependency-free:
 * the registry validates `output.schema` against the enforced JSON Schema
 * subset, so both schemas below use only `type`, `properties`, `required`,
 * `items`, `additionalProperties`, and `enum`.
 *
 * @module dsh-rea/lib/tools
 */

import { inspectRepoCandidates } from './options.js'

const RESULT_DESCRIPTION =
  'Run one REA (rea-agents) command line invocation. REA is the local reverse-engineering engine: ' +
  'disassembly, decompilation, JavaScript/Electron reconstruction, Android, managed, firmware, ' +
  'browser, and EVM analysis over shared CLI/MCP workflows. Pass the command and its arguments as ' +
  'an array, for example ["analyze", "C:\\\\path\\\\to\\\\app", "--provider", "ghidra", "--json"]. ' +
  'Always request --json for machine-readable Evidence, and prefer saving large Evidence to a file ' +
  'with the shell rather than returning it inline. Discover the surface with ["--help"], ' +
  '["<command>", "--help"], ["providers", "--json"], or the rea_doctor tool.'

const DOCTOR_DESCRIPTION =
  'Resolve the REA runtime for this host, report its version, and summarize REA readiness: ' +
  'analysis providers (Hopper/Ghidra/IDA), capability availability, and the packaged skill identity. ' +
  'Call this once before the first REA task of a session when the runtime or an analysis engine is ' +
  'uncertain, or when a previous REA invocation failed to start. It never installs or changes anything.'

/**
 * Register both tools on one mount.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the plugin context.
 * @param {{ runtime: object, options: object }} deps - runtime facade and resolved options.
 */
export function registerReaTools(ctx, deps) {
  ctx.tools.register(reaTool(deps))
  ctx.tools.register(doctorTool(deps))
}

/** The general-purpose CLI runner. */
function reaTool({ runtime }) {
  return {
    name: 'rea',
    description: RESULT_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Command and arguments passed to the REA CLI, e.g. ["providers", "--json"].',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the invocation; an absolute path. Defaults to the resolved REA checkout.',
        },
        timeoutMs: {
          type: 'integer',
          description: 'Terminate the invocation after this many milliseconds. Defaults to the configured limit (600000).',
        },
        maxOutputBytes: {
          type: 'integer',
          description: 'Inline stdout limit in bytes. Larger stdout is kept on disk and returned as stdoutPath. Defaults to 262144.',
        },
      },
      required: ['args'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['ok'],
        properties: {
          ok: { type: 'boolean', description: 'True only when REA exited zero and was not terminated.' },
          command: { type: 'string', description: 'The exact command line that ran.' },
          cwd: { type: 'string' },
          exitCode: { type: 'integer' },
          timedOut: { type: 'boolean' },
          durationMs: { type: 'integer' },
          stdout: { type: 'string', description: 'Complete stdout, or a head/tail preview when it exceeded the limit.' },
          stderr: { type: 'string' },
          stdoutBytes: { type: 'integer' },
          spilledStdout: { type: 'boolean', description: 'True when stdout exceeded the inline limit and was kept on disk.' },
          stdoutPath: { type: 'string', description: 'Path of the complete stdout kept on disk.' },
          runtime: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string' },
              label: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['kind', 'label'],
          },
          error: {
            type: 'object',
            additionalProperties: false,
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              rejected: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    kind: { type: 'string' },
                    label: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['kind'],
                },
              },
            },
            required: ['code', 'message'],
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: renderRun(value) }],
    },
    async execute(args, exec) {
      return runtime.run({
        args: Array.isArray(args?.args) ? args.args : [],
        cwd: typeof args?.cwd === 'string' ? args.cwd : undefined,
        timeoutMs: typeof args?.timeoutMs === 'number' ? args.timeoutMs : undefined,
        maxOutputBytes: typeof args?.maxOutputBytes === 'number' ? args.maxOutputBytes : undefined,
        signal: exec?.signal,
      })
    },
  }
}

/** The readiness reporter: runtime resolution plus the two read-only REA queries. */
function doctorTool({ runtime, options }) {
  return {
    name: 'rea_doctor',
    description: DOCTOR_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        full: {
          type: 'boolean',
          description: 'Include every failed readiness check instead of the first eight.',
        },
        timeoutMs: { type: 'integer', description: 'Per-query timeout in milliseconds; defaults to 180000.' },
      },
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['resolved'],
        properties: {
          resolved: { type: 'boolean', description: 'Whether a working REA runtime was found and answered --version.' },
          cliVersion: { type: 'string' },
          nodeVersion: { type: 'string' },
          host: { type: 'string' },
          remediation: { type: 'string', description: 'Actionable next step when the runtime is unresolved.' },
          runtime: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string' },
              label: { type: 'string' },
              version: { type: 'string' },
            },
            required: ['kind', 'label'],
          },
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                repoPath: { type: 'string' },
                exists: { type: 'boolean' },
                built: { type: 'boolean' },
                entryExists: { type: 'boolean' },
              },
              required: ['repoPath', 'exists', 'built', 'entryExists'],
            },
          },
          healthy: { type: 'boolean', description: 'REA\'s own doctor verdict; false also reports missing engines.' },
          checks: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                ok: { type: 'boolean' },
                classification: { type: 'string' },
                detail: { type: 'string' },
                remediation: { type: 'string' },
              },
              required: ['name', 'ok'],
            },
          },
          providers: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                reason: { type: 'string' },
              },
              required: ['id', 'status'],
            },
          },
          catalog: {
            type: 'object',
            additionalProperties: false,
            properties: {
              cliCommands: { type: 'integer' },
              mcpTools: { type: 'integer' },
              mcpPrompts: { type: 'integer' },
            },
          },
          skill: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
            },
          },
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
      render: (_args, value) => [{ type: 'text', text: renderDoctor(value) }],
    },
    async execute(args, exec) {
      const timeoutMs = typeof args?.timeoutMs === 'number' ? args.timeoutMs : 180_000
      const notes = []
      const resolved = await runtime.resolve()
      const value = {
        resolved: resolved.kind !== 'unresolved',
        nodeVersion: process.version,
        host: `${process.platform} ${process.arch}`,
        candidates: inspectRepoCandidates(options),
        notes,
      }

      if (!value.resolved) {
        value.remediation = resolved.remediation ?? 'Set repoPath/cliPath/DSH_REA_REPO.'
        for (const rejection of resolved.rejected ?? []) {
          notes.push(`rejected ${rejection.kind} (${rejection.label}): ${rejection.reason}`)
        }
        return value
      }

      value.runtime = { kind: resolved.kind, label: resolved.label, version: resolved.version ?? '' }

      const providersRun = await runtime.run({ args: ['providers', '--json'], timeoutMs, signal: exec?.signal })
      const providersJson = parseJson(providersRun.stdout)
      if (providersJson === undefined) {
        notes.push(describeUnparsed('providers --json', providersRun))
      } else {
        const identity = providersJson.server_identity ?? {}
        if (typeof identity.package?.version === 'string') value.cliVersion = identity.package.version
        const candidates = Array.isArray(providersJson.analysis_provider_candidates) ? providersJson.analysis_provider_candidates : []
        if (candidates.length > 0) {
          value.providers = candidates.map(entry => ({
            id: String(entry?.provider?.id ?? 'unknown'),
            status: String(entry?.availability?.status ?? 'unknown'),
            ...(typeof entry?.availability?.reason === 'string' ? { reason: entry.availability.reason } : {}),
          }))
        }
        const counts = identity.catalog?.counts
        if (counts !== undefined && typeof counts === 'object') {
          value.catalog = compactNumbers({
            cliCommands: counts.cli_commands,
            mcpTools: counts.mcp_tools,
            mcpPrompts: counts.mcp_prompts,
          })
        }
        if (typeof identity.skill?.name === 'string') {
          value.skill = {
            name: identity.skill.name,
            ...(identity.skill.expected_version !== undefined ? { version: String(identity.skill.expected_version) } : {}),
          }
        }
      }

      const doctorRun = await runtime.run({ args: ['doctor', '--json'], timeoutMs, signal: exec?.signal })
      const doctorJson = parseJson(doctorRun.stdout)
      if (doctorJson === undefined) {
        notes.push(describeUnparsed('doctor --json', doctorRun))
        return value
      }
      if (typeof doctorJson.healthy === 'boolean') value.healthy = doctorJson.healthy
      const checks = Array.isArray(doctorJson.checks) ? doctorJson.checks : []
      value.checks = checks.map(check => ({
        name: String(check?.name ?? 'unknown'),
        ok: check?.ok === true,
        ...(typeof check?.classification === 'string' ? { classification: check.classification } : {}),
        ...(typeof check?.detail === 'string' ? { detail: check.detail } : {}),
        ...(typeof check?.remediation === 'string' ? { remediation: check.remediation } : {}),
      }))
      if (value.checks.length > 0 && value.checks.every(check => check.ok !== true)) {
        notes.push('REA reports no healthy readiness check; analysis engines are bring-your-own (Ghidra/IDA/Hopper).')
      }
      return value
    },
  }
}

function renderRun(value) {
  const lines = []
  if (value.command !== undefined) lines.push(`$ ${value.command}`)
  const status = value.ok === true ? 'ok' : `failed${value.timedOut === true ? ' (timed out)' : ''}`
  lines.push(`status: ${status}  exit: ${value.exitCode ?? 'n/a'}  ${value.durationMs ?? 0} ms`)
  if (value.cwd !== undefined) lines.push(`cwd: ${value.cwd}`)
  if (value.error !== undefined) {
    lines.push(`error: ${value.error.code} - ${value.error.message}`)
    for (const rejection of value.error.rejected ?? []) lines.push(`  rejected ${rejection.kind}: ${rejection.reason ?? ''}`)
  }
  if (value.runtime !== undefined) lines.push(`runtime: ${value.runtime.label}${value.runtime.version ? ` (${value.runtime.version})` : ''}`)
  if (value.spilledStdout === true && value.stdoutPath !== undefined) lines.push(`stdout: ${value.stdoutBytes} bytes, complete file at ${value.stdoutPath}`)
  if (value.stdout !== undefined && value.stdout !== '') lines.push('', value.stdout.replace(/\s+$/, ''))
  if (value.stderr !== undefined && value.stderr !== '') lines.push('', 'stderr:', value.stderr.replace(/\s+$/, ''))
  return lines.join('\n')
}

function renderDoctor(value) {
  const lines = []
  if (value.resolved !== true) {
    lines.push('REA runtime: unresolved')
    if (value.remediation !== undefined) lines.push(`next: ${value.remediation}`)
    for (const note of value.notes ?? []) lines.push(`rejected: ${note}`)
    return lines.join('\n')
  }
  lines.push(`REA runtime: ${value.runtime.label}${value.runtime.version ? ` (${value.runtime.version})` : ''}`)
  lines.push(`host: ${value.host}  node: ${value.nodeVersion}${value.cliVersion ? `  rea: ${value.cliVersion}` : ''}`)
  if (value.healthy !== undefined) lines.push(`healthy: ${value.healthy}`)
  const failed = (value.checks ?? []).filter(check => check.ok !== true)
  const passed = (value.checks ?? []).filter(check => check.ok === true)
  for (const check of passed) lines.push(`ok   ${check.name}${check.detail ? ` - ${check.detail}` : ''}`)
  for (const check of failed) {
    lines.push(`fail ${check.name}${check.classification ? ` [${check.classification}]` : ''}${check.detail ? ` - ${check.detail}` : ''}`)
    if (check.remediation !== undefined) lines.push(`     ${check.remediation}`)
  }
  for (const provider of value.providers ?? []) {
    lines.push(`provider ${provider.id}: ${provider.status}${provider.reason ? ` - ${provider.reason}` : ''}`)
  }
  if (value.catalog !== undefined) {
    lines.push(`catalog: ${value.catalog.cliCommands ?? '?'} CLI commands, ${value.catalog.mcpTools ?? '?'} MCP tools, ${value.catalog.mcpPrompts ?? '?'} prompts`)
  }
  if (value.skill !== undefined) lines.push(`skill: ${value.skill.name}${value.skill.version ? ` v${value.skill.version}` : ''}`)
  for (const note of value.notes ?? []) lines.push(`note: ${note}`)
  return lines.join('\n')
}

function parseJson(text) {
  const trimmed = String(text ?? '').trim()
  if (trimmed === '') return undefined
  try {
    const parsed = JSON.parse(trimmed)
    return parsed !== null && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

function describeUnparsed(query, run) {
  const detail = run.error?.message ?? `exit ${run.exitCode}`
  return `${query} returned unparsable output (${detail}); stderr: ${String(run.stderr ?? '').slice(0, 400)}`
}

function compactNumbers(record) {
  const result = {}
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number' && Number.isSafeInteger(value)) result[key] = value
  }
  return result
}