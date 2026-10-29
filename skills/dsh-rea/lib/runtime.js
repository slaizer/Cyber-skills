/**
 * REA runtime resolution and invocation.
 *
 * One REA command is one child process (`rea` is a per-invocation CLI), so this
 * module owns exactly two jobs: decide which entry point to run, and run it
 * with cancelable capture.
 *
 * Capture uses inherited file descriptors instead of pipes. Pipes are the
 * documented failure mode of confined Windows sandboxes (named-pipe EPERM), and
 * REA Evidence can be hundreds of megabytes, so a file descriptor is both more
 * portable and more honest about large output: anything above the inline limit
 * is kept on disk and returned as a path.
 *
 * @module dsh-rea/lib/runtime
 */

import { spawn, spawnSync } from 'node:child_process'
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { inspectRepoCandidates } from './options.js'

const EXPORT_PREVIEW_HEAD_SHARE = 0.6
const STDERR_LIMIT_BYTES = 32 * 1024

/**
 * Create the runtime facade for one plugin mount.
 * @param {ReturnType<import('./options.js').resolveOptions>} options - resolved options.
 * @returns {{ resolve: (opts?: { refresh?: boolean }) => Promise<object>, run: (input: object) => Promise<object>, invalidate: () => void, describe: () => object }}
 */
export function createRuntime(options) {
  let cached

  async function resolveRuntime(opts = {}) {
    if (opts.refresh === true) cached = undefined
    if (cached === undefined) cached = await discover(options, opts)
    return cached
  }

  return {
    resolve: resolveRuntime,
    invalidate: () => {
      cached = undefined
    },
    describe: () => ({
      resolved: cached ?? null,
      candidates: inspectRepoCandidates(options),
      npxPackage: options.npxPackage,
      npxVersion: options.npxVersion,
      timeoutMs: options.timeoutMs,
      maxOutputBytes: options.maxOutputBytes,
      spillDir: options.spillDir,
    }),
    run: async input => {
      const runtime = await resolveRuntime()
      return runResolved(runtime, {
        timeoutMs: options.timeoutMs,
        maxOutputBytes: options.maxOutputBytes,
        spillDir: options.spillDir,
        ...input,
      })
    },
  }
}

/** Walk the resolution ladder and return the first runtime that actually answers `--version`. */
async function discover(options) {
  const attempts = []

  if (options.cliPath !== '') attempts.push(explicitRuntime(options.cliPath))
  for (const candidate of options.repoCandidates) {
    if (existsSync(join(candidate, 'dist', 'cli.js')) && existsSync(join(candidate, 'scripts', 'rea.mjs'))) {
      attempts.push({
        kind: 'checkout',
        label: `REA checkout ${candidate}`,
        command: process.execPath,
        prefixArgs: [join(candidate, 'scripts', 'rea.mjs')],
        cwd: candidate,
        repoPath: candidate,
      })
    }
  }
  const onPath = findExecutable(['rea', 'rea.cmd'])
  if (onPath !== undefined) attempts.push(executableRuntime('path', onPath, `REA on PATH (${onPath})`))
  const npx = npxRuntime(options)
  if (npx !== undefined) attempts.push(npx)

  const rejected = []
  for (const attempt of attempts) {
    const probe = await runResolved(attempt, { args: ['--version'], timeoutMs: 120_000, maxOutputBytes: 4096 })
    const version = probe.ok ? probe.stdout.trim().split(/\r?\n/)[0].trim() : ''
    if (probe.ok && version !== '') return { ...attempt, version }
    rejected.push({
      kind: attempt.kind,
      label: attempt.label,
      reason: probe.ok ? 'no version output' : probe.error?.message ?? `exit ${probe.exitCode}`,
    })
  }

  const unbuilt = options.repoCandidates.filter(candidate =>
    existsSync(candidate) && !existsSync(join(candidate, 'dist', 'cli.js')),
  )
  return {
    kind: 'unresolved',
    label: 'REA runtime not resolved',
    version: '',
    rejected,
    remediation: unbuilt.length > 0
      ? `Build the REA checkout first: cd ${unbuilt[0]} && npm ci --engine-strict=false && npm run build:cached`
      : `Install REA (npm i -g ${options.npxPackage}) or set repoPath / cliPath / DSH_REA_REPO.`,
  }
}

function explicitRuntime(cliPath) {
  const absolute = resolve(cliPath)
  if (/\.(mjs|cjs|js)$/i.test(absolute)) {
    return { kind: 'cliPath', label: `REA entry ${absolute}`, command: process.execPath, prefixArgs: [absolute] }
  }
  return executableRuntime('cliPath', absolute, `REA ${absolute}`)
}

function executableRuntime(kind, file, label) {
  if (/\.(cmd|bat)$/i.test(file)) {
    // Batch shims are not valid spawn targets on Windows; run them through cmd.
    return { kind, label, command: process.env.ComSpec ?? 'cmd.exe', prefixArgs: ['/d', '/s', '/c'], script: quoteForCmd(file) }
  }
  return { kind, label, command: file, prefixArgs: [] }
}

/** Resolve the npm CLI shim, preferring the JS entry over an `npx` batch shim. */
function npxRuntime(options) {
  const spec = `${options.npxPackage}@${options.npxVersion}`
  const npxCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')
  if (existsSync(npxCli)) {
    return {
      kind: 'npx',
      label: `npx --yes ${spec} (via ${npxCli})`,
      command: process.execPath,
      prefixArgs: [npxCli, '--yes', spec],
    }
  }
  const shim = findExecutable(['npx', 'npx.cmd'])
  if (shim === undefined) return undefined
  const runtime = executableRuntime('npx', shim, `npx --yes ${spec} (${shim})`)
  return runtime.script === undefined
    ? { ...runtime, prefixArgs: ['--yes', spec] }
    : { ...runtime, script: quoteForCmd(shim), scriptPrefixArgs: ['--yes', spec] }
}

/** Build the argument vector for one invocation of a resolved runtime. */
export function buildArgv(runtime, args) {
  if (runtime.script !== undefined) {
    const head = [runtime.script, ...(runtime.scriptPrefixArgs ?? []).map(quoteForCmd), ...args.map(quoteForCmd)]
    return [...runtime.prefixArgs, head.join(' ')]
  }
  return [...(runtime.prefixArgs ?? []), ...args]
}

/**
 * Run one resolved REA invocation with file-descriptor capture.
 * @param {object} runtime - a resolved runtime, or the unresolved descriptor.
 * @param {{ args: string[], cwd?: string, timeoutMs?: number, maxOutputBytes?: number, spillDir?: string, signal?: AbortSignal }} input
 * @returns {Promise<object>} the canonical result value declared by the tool schema.
 */
export async function runResolved(runtime, input) {
  const args = Array.isArray(input.args) ? input.args.map(String) : []
  const argv = buildArgv(runtime, args)
  const startedAt = Date.now()

  if (runtime.kind === 'unresolved') {
    return {
      ok: false,
      command: '',
      exitCode: -1,
      durationMs: 0,
      error: {
        code: 'runtime_unresolved',
        message: runtime.remediation ?? 'REA runtime not resolved',
        rejected: runtime.rejected ?? [],
      },
    }
  }

  const timeoutMs = positiveInteger(input.timeoutMs, 600_000)
  const maxOutputBytes = positiveInteger(input.maxOutputBytes, 256 * 1024)
  const cwd = typeof input.cwd === 'string' && input.cwd !== '' ? resolve(input.cwd) : runtime.cwd
  const scratch = scratchFiles()
  let child

  try {
    child = spawn(runtime.command, argv, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', scratch.outFd, scratch.errFd],
      env: process.env,
    })
  } catch (error) {
    scratch.cleanup()
    return {
      ok: false,
      command: commandLine(runtime.command, argv),
      exitCode: -1,
      durationMs: Date.now() - startedAt,
      error: { code: 'spawn_failed', message: String(error?.message ?? error) },
    }
  }

  const outcome = await settle(child, timeoutMs, input.signal)
  const stdoutRaw = scratch.read('out')
  const stderrRaw = scratch.read('err')
  scratch.cleanup()

  const overLimit = Buffer.byteLength(stdoutRaw) > maxOutputBytes
  const stdoutPath = overLimit
    ? spill(stdoutRaw, argv, input.spillDir ?? join(tmpdir(), 'dsh-rea-spill'))
    : undefined
  const stdout = overLimit ? exportPreview(stdoutRaw, stdoutPath, maxOutputBytes) : stdoutRaw

  return pruneUndefined({
    ok: outcome.exitCode === 0 && !outcome.timedOut,
    runtime: { kind: runtime.kind, label: runtime.label, version: runtime.version ?? '' },
    command: commandLine(runtime.command, argv),
    cwd: cwd ?? process.cwd(),
    exitCode: outcome.exitCode,
    timedOut: outcome.timedOut,
    durationMs: Date.now() - startedAt,
    stdout,
    stderr: truncate(stderrRaw, STDERR_LIMIT_BYTES),
    stdoutBytes: Buffer.byteLength(stdoutRaw),
    spilledStdout: overLimit,
    stdoutPath,
    error: outcome.failure,
  })
}

/**
 * Drop `undefined` properties.
 *
 * Tool results are materialized as lossless JSON, where an explicit `undefined`
 * key is invalid — not merely an absent field. Every optional field in this
 * module's results is therefore pruned instead of passed through.
 * @param {Record<string, unknown>} value - the candidate result object.
 * @returns {Record<string, unknown>} the same object without undefined properties.
 */
export function pruneUndefined(value) {
  const result = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) result[key] = entry
  }
  return result
}

/** Wait for one child, enforcing the timeout and the caller's cancellation signal. */
function settle(child, timeoutMs, signal) {
  return new Promise(resolveOutcome => {
    let timedOut = false
    let settled = false
    const timer = setTimeout(() => {
      timedOut = true
      killTree(child)
    }, timeoutMs)
    const onAbort = () => killTree(child)
    signal?.addEventListener('abort', onAbort, { once: true })

    const finish = (exitCode, failure) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolveOutcome({ exitCode, timedOut, failure })
    }

    child.on('error', error => finish(-1, { code: error?.code ?? 'spawn_error', message: String(error?.message ?? error) }))
    child.on('close', (code, childSignal) => {
      if (timedOut) {
        finish(code ?? -1, { code: 'timeout', message: `REA exceeded ${timeoutMs} ms and was terminated.` })
        return
      }
      if (signal?.aborted === true) {
        finish(code ?? -1, { code: 'aborted', message: 'The caller cancelled this REA invocation.' })
        return
      }
      finish(code ?? (childSignal === null ? 0 : -1), undefined)
    })
  })
}

function killTree(child) {
  try {
    if (process.platform === 'win32' && child.pid !== undefined) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' })
    } else {
      child.kill('SIGKILL')
    }
  } catch {
    // Best effort: the child may already be gone.
  }
}

function scratchFiles() {
  const dir = join(tmpdir(), `dsh-rea-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  mkdirSync(dir, { recursive: true })
  const out = join(dir, 'stdout.txt')
  const err = join(dir, 'stderr.txt')
  const outFd = openSync(out, 'w')
  const errFd = openSync(err, 'w')
  return {
    outFd,
    errFd,
    read: which => {
      try {
        return readFileSync(which === 'out' ? out : err, 'utf8')
      } catch {
        return ''
      }
    },
    cleanup: () => {
      try {
        closeSync(outFd)
      } catch {
        // Already closed.
      }
      try {
        closeSync(errFd)
      } catch {
        // Already closed.
      }
      try {
        removeRecursiveSync(dir)
      } catch {
        // Leftover scratch files are harmless.
      }
    },
  }
}

/** Keep oversized stdout on disk instead of truncating it away. */
function spill(text, argv, spillDir) {
  try {
    mkdirSync(spillDir, { recursive: true })
    const command = sanitizeSegment(argv.find(entry => !entry.startsWith('-')) ?? 'output')
    const file = join(spillDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${command}.out`)
    writeFileSync(file, text, 'utf8')
    return file
  } catch {
    return undefined
  }
}

/**
 * Preview an oversized stdout without ever exceeding the caller's inline budget.
 *
 * The limit drives the split, not a fixed constant: a caller who asks for a
 * 512-byte preview must not receive 12 KiB because the tool happened to default
 * its head and tail sizes. Head and tail are cut from one shared budget so the
 * preview stays a preview.
 * @param {string} text - complete stdout.
 * @param {string | undefined} path - the file holding the complete stdout.
 * @param {number} limit - the caller's inline byte budget.
 * @returns {string} the bounded preview naming the complete file.
 */
function exportPreview(text, path, limit) {
  const headBudget = Math.max(1, Math.floor(limit * EXPORT_PREVIEW_HEAD_SHARE))
  const tailBudget = Math.max(0, limit - headBudget)
  const head = text.slice(0, headBudget)
  const tail = tailBudget === 0 ? '' : text.slice(Math.max(head.length, text.length - tailBudget))
  const marker = `\n\n... [${text.length} characters kept at ${path ?? 'a scratch file that could not be persisted'}] ...`
  return tail === '' ? `${head}${marker}\n\n` : `${head}${marker}\n\n${tail}`
}

function sanitizeSegment(value) {
  const cleaned = String(value).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return cleaned === '' ? 'output' : cleaned
}

function truncate(text, limit) {
  if (Buffer.byteLength(text) <= limit) return text
  return `${text.slice(0, limit)}\n... [stderr truncated at ${limit} bytes]`
}

function commandLine(command, argv) {
  return [command, ...argv].map(entry => (/\s/.test(entry) ? JSON.stringify(entry) : entry)).join(' ')
}

function quoteForCmd(value) {
  return /[\s"&|<>^]/.test(value) ? `"${String(value).replace(/"/g, '""')}"` : value
}

/** Pipe-free PATH lookup: never spawns a helper, so it cannot hit sandbox EPERM. */
export function findExecutable(names, env = process.env) {
  const directories = (env.PATH ?? '').split(delimiter).filter(Boolean)
  const extensions = process.platform === 'win32'
    ? (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : ['']
  for (const directory of directories) {
    for (const name of names) {
      for (const extension of extensions) {
        const candidates = process.platform === 'win32'
          ? [join(directory, name + extension.toLowerCase()), join(directory, name + extension)]
          : [join(directory, name)]
        for (const candidate of candidates) {
          if (isFile(candidate)) return candidate
        }
      }
    }
  }
  return undefined
}

function isFile(candidate) {
  try {
    return statSync(candidate).isFile()
  } catch {
    return false
  }
}

/**
 * Recursively delete a tree through libuv, never through `fs.rmSync`.
 *
 * On Windows, `fs.rmSync` builds its path from a narrow ANSI string and is a
 * SILENT NO-OP for any path containing non-ASCII characters — and a Windows
 * user profile named in Chinese puts every temp path in that class. The
 * `unlinkSync`/`rmdirSync` pair goes through libuv and converts correctly, so
 * scratch cleanup actually deletes instead of quietly accumulating files.
 * @param {string} target - file or directory to remove.
 */
export function removeRecursiveSync(target) {
  let stats
  try {
    stats = lstatSync(target)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }

  if (stats.isDirectory() && !stats.isSymbolicLink()) {
    let entries
    try {
      entries = readdirSync(target)
    } catch (error) {
      if (error?.code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) removeRecursiveSync(join(target, entry))
    try {
      rmdirSync(target)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    return
  }

  try {
    unlinkSync(target)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

function positiveInteger(value, fallback) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}