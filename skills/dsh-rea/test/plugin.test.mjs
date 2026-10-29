/**
 * Mount-time and end-to-end tests for the dsh-rea bundle.
 *
 * These run against a fake `ctx` (the shape `ctx.skills` and `ctx.tools`
 * expose) plus the real resolved REA checkout, so they prove three separate
 * things: registration happens with the documented shape, both tool schemas stay
 * inside the enforced JSON Schema subset, and a real REA invocation answers.
 *
 * @module dsh-rea/test/plugin.test
 */

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { apply, inject, name } from '../index.js'
import { buildArgv, removeRecursiveSync, runResolved } from '../lib/runtime.js'
import { assertPackagedSkills, loadSkills, parseSkillDocument } from '../lib/skills.js'

const PLUGIN_DIR = fileURLToPath(new URL('..', import.meta.url))
const PACKAGED_SKILLS = join(PLUGIN_DIR, 'skills')
const FIXTURE_SKILLS = join(PLUGIN_DIR, 'test', 'fixtures', 'priority')

/**
 * Skip the cases that would execute REA itself.
 *
 * The runtime ladder ends at `npx rea-agents`, so on a clean machine those cases
 * reach the network. CI sets this to keep a run deterministic; a developer with
 * REA installed leaves it unset and gets the real end-to-end coverage.
 */
const LIVE_DISABLED = process.env.DSH_REA_TEST_SKIP_LIVE === '1'

/**
 * The validator the running DSH runtime uses on tool results, when this host can
 * see it. It is authoritative: the local walker below is only a fallback for
 * machines without that runtime on disk.
 */
const runtimeValues = await loadRuntimeValues()

async function loadRuntimeValues() {
  const candidates = []
  if (process.env.DSH_RUNTIME_MODULES) {
    candidates.push(join(process.env.DSH_RUNTIME_MODULES, '@deepseek-ai', 'dsh-util-values', 'lib', 'index.js'))
  }
  if (process.env.LOCALAPPDATA) {
    for (const root of ['app\\dsh', 'app.asar.unpacked\\dsh']) {
      candidates.push(join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness', 'resources', root,
        'node_modules', '@deepseek-ai', 'dsh-util-values', 'lib', 'index.js'))
    }
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    try {
      const module = await import(pathToFileURL(candidate).href)
      if (typeof module.snapshotJsonValue === 'function') return module
    } catch {
      // Another candidate may still load; fall through to the local walker.
    }
  }
  return undefined
}

/** The keywords the tool registry enforces; anything else must not appear. */
const ALLOWED_SCHEMA_KEYWORDS = new Set([
  'type',
  'oneOf',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'description',
  'title',
  'default',
  'examples',
])

function fakeContext() {
  const captured = { provider: undefined, tools: [] }
  return {
    captured,
    ctx: {
      skills: {
        registerProvider(create) {
          captured.provider = create({ signal: new AbortController().signal, invalidate: () => {} })
          return () => {}
        },
      },
      tools: {
        register(definition) {
          captured.tools.push(definition)
          return () => {}
        },
      },
    },
  }
}

test('mounts the packaged skill and both tools', async () => {
  assert.equal(name, 'dsh-rea')
  assert.deepEqual(inject, ['skills', 'tools'])

  const { ctx, captured } = fakeContext()
  apply(ctx, {})

  assert.equal(captured.provider.name, 'dsh-rea')
  const candidates = await captured.provider.list({})
  assert.equal(candidates.length, 1, 'exactly one packaged skill')

  const [candidate] = candidates
  assert.equal(candidate.name, 'reverse-engineer-anything')
  assert.equal(candidate.provider, 'dsh-rea')
  assert.equal(candidate.source, 'bundled')
  assert.equal(candidate.rank, 600)
  assert.equal(candidate.resourceBase.kind, 'directory')
  assert.ok(existsSync(join(candidate.resourceBase.path, 'SKILL.md')), 'skill directory holds SKILL.md')
  assert.match(candidate.description, /reverse engineer/i)
  assert.equal(candidate.metadata.version, '35', 'nested metadata survives parsing')

  const definition = await captured.provider.get(candidate, {})
  assert.equal(definition.name, 'reverse-engineer-anything')
  assert.match(definition.content, /# REA/)
  assert.match(definition.content, /rea_doctor/, 'the body documents the DSH tools')
  assert.ok(!definition.content.startsWith('---'), 'frontmatter is stripped from the body')

  assert.deepEqual(
    captured.tools.map(tool => tool.name),
    ['rea', 'rea_doctor'],
  )
})

test('every declared schema stays inside the enforced JSON Schema subset', () => {
  const { ctx, captured } = fakeContext()
  apply(ctx, {})

  for (const tool of captured.tools) {
    assert.equal(typeof tool.description, 'string')
    assert.ok(tool.description.length > 40, `${tool.name} description routes the model`)
    assert.equal(typeof tool.execute, 'function')
    assert.equal(typeof tool.output?.render, 'function', `${tool.name} declares output.render`)
    assertSchema(tool.parameters, `${tool.name}.parameters`)
    assertSchema(tool.output.schema, `${tool.name}.output.schema`)
    assert.equal(tool.output.schema.type, 'object', `${tool.name} output is object-rooted`)
  }

  const rea = captured.tools.find(tool => tool.name === 'rea')
  assert.deepEqual(rea.parameters.required, ['args'])
  assert.equal(rea.parameters.properties.args.type, 'array')
  assert.equal(rea.parameters.additionalProperties, false)
  const rendered = rea.output.render({ args: [] }, {
    ok: true,
    command: 'rea --version',
    exitCode: 0,
    stdout: '6.3.0',
    durationMs: 12,
  })
  assert.equal(rendered[0].type, 'text')
  assert.match(rendered[0].text, /6\.3\.0/)
})

test('an unusable packaged skill root fails the mount instead of serving an empty catalog', () => {
  const missing = join(tmpdir(), `dsh-rea-missing-${Date.now().toString(36)}`)
  assert.throws(() => assertPackagedSkills({ pluginDir: missing }), /packaged skill root is missing/)

  const scratch = mkdtempSync(join(tmpdir(), 'dsh-rea-broken-'))
  const skillsRoot = join(scratch, 'skills')
  try {
    // A SKILL.md without frontmatter is not a bundle.
    const noFrontmatter = join(skillsRoot, 'no-frontmatter')
    mkdirSync(noFrontmatter, { recursive: true })
    writeFileSync(join(noFrontmatter, 'SKILL.md'), 'plain markdown\n', 'utf8')
    assert.throws(() => assertPackagedSkills({ pluginDir: scratch }), /is not a skill bundle/)

    // A bundle with an invalid name is an author error, not a silent skip.
    const invalidName = join(skillsRoot, 'invalid-name')
    mkdirSync(invalidName, { recursive: true })
    writeFileSync(join(invalidName, 'SKILL.md'), '---\nname: Not_Kebab\ndescription: x\n---\n', 'utf8')
    assert.throws(() => assertPackagedSkills({ pluginDir: scratch }), /invalid skill name/)

    // Only non-directory entries means no bundle at all.
    const looseOnly = mkdtempSync(join(tmpdir(), 'dsh-rea-loose-'))
    mkdirSync(join(looseOnly, 'skills'), { recursive: true })
    writeFileSync(join(looseOnly, 'skills', 'loose.md'), 'not a bundle\n', 'utf8')
    try {
      assert.throws(() => assertPackagedSkills({ pluginDir: looseOnly }), /no SKILL\.md bundles found/)
    } finally {
      removeRecursiveSync(looseOnly)
    }
  } finally {
    removeRecursiveSync(scratch)
  }
})

test('recursive deletion works on a non-ASCII path, where stock fs.rmSync can silently no-op', async t => {
  const scratch = mkdtempSync(join(tmpdir(), 'dsh-rea-unicode-'))
  try {
    const nested = join(scratch, '汉字目录', 'deeper')
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(nested, 'file.txt'), 'x', 'utf8')
    assert.ok(existsSync(join(nested, 'file.txt')), 'the fixture was written')

    const { rmSync } = await import('node:fs')
    rmSync(scratch, { recursive: true, force: true })
    const stockLeftSomethingBehind = existsSync(scratch)

    removeRecursiveSync(scratch)
    assert.equal(existsSync(scratch), false, 'the plugin helper deletes the whole tree')

    if (stockLeftSomethingBehind) {
      t.diagnostic('stock fs.rmSync silently no-oped on this non-ASCII temp path; removeRecursiveSync covered it')
    }
  } finally {
    removeRecursiveSync(scratch)
  }
})

test('frontmatter parsing rejects invalid bundles and ignores non-bundles', () => {
  assert.equal(parseSkillDocument('# plain markdown\n'), undefined)
  assert.throws(() => parseSkillDocument('---\nname: ok-name\n---\n'), /requires a description/, 'a name alone is a malformed bundle')
  assert.throws(() => parseSkillDocument('---\nname: Not_Kebab\ndescription: x\n---\n'), /invalid skill name/)
  assert.throws(() => parseSkillDocument('---\nname: no-desc\n---\nmore\n'), /requires a description/)

  const parsed = parseSkillDocument(
    '---\nname: sample\ndescription: "quoted: description # kept"\ndisable-model-invocation: true\nmetadata:\n  version: "7"\n---\nbody\n',
  )
  assert.equal(parsed.name, 'sample')
  assert.equal(parsed.description, 'quoted: description # kept')
  assert.equal(parsed.invocation.modelInvocable, false)
  assert.equal(parsed.metadata.version, '7')
})

test('an earlier skill root wins a duplicate name', async () => {
  const priority = await loadSkills([FIXTURE_SKILLS, PACKAGED_SKILLS], undefined)
  assert.equal(priority.length, 1, 'the duplicate name is de-duplicated')
  assert.match(priority[0].description, /priority fixture/i)
  assert.match(priority[0].content, /fixture body/)

  const packagedOnly = await loadSkills([PACKAGED_SKILLS], undefined)
  assert.match(packagedOnly[0].description, /Reverse engineer native/)
})

test('argument composition covers both the JS entry and the Windows batch shim', () => {
  assert.deepEqual(
    buildArgv({ prefixArgs: ['C:/tmp/npx-cli.js', '--yes', 'rea-agents@6.3.0'] }, ['providers', '--json']),
    ['C:/tmp/npx-cli.js', '--yes', 'rea-agents@6.3.0', 'providers', '--json'],
  )
  assert.deepEqual(
    buildArgv({ prefixArgs: ['/d', '/s', '/c'], script: 'C:/npm/rea.cmd' }, ['analyze', 'C:/target', '--json']),
    ['/d', '/s', '/c', 'C:/npm/rea.cmd analyze C:/target --json'],
  )
})

test('a real REA invocation returns its version', async t => {
  if (LIVE_DISABLED) {
    t.skip('DSH_REA_TEST_SKIP_LIVE=1 keeps this run off the network')
    return
  }
  const { ctx, captured } = fakeContext()
  apply(ctx, {})
  const rea = captured.tools.find(tool => tool.name === 'rea')

  const version = await rea.execute({ args: ['--version'], timeoutMs: 120_000 }, {})
  if (version.ok !== true) {
    t.skip(`no usable REA runtime on this host: ${version.error?.code ?? version.exitCode} ${version.error?.message ?? ''}`)
    return
  }
  assertLosslessJson(version, 'rea result')
  assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/)
  assert.equal(version.timedOut, false)
  assert.equal(version.runtime.version, version.stdout.trim())
  assert.ok(['checkout', 'path', 'npx', 'cliPath'].includes(version.runtime.kind), `unexpected runtime kind ${version.runtime.kind}`)
  assert.ok(!('spilledStdout' in version) || version.spilledStdout === false)
  assert.ok(!('stdoutPath' in version), 'unspilled results carry no stdoutPath key at all')
  assert.ok(!('error' in version), 'successful runs carry no error key at all')
})

test('stdout above the inline limit is spilled to a complete file', async t => {
  if (LIVE_DISABLED) {
    t.skip('DSH_REA_TEST_SKIP_LIVE=1 keeps this run off the network')
    return
  }
  const { ctx, captured } = fakeContext()
  apply(ctx, {})
  const rea = captured.tools.find(tool => tool.name === 'rea')

  const spilled = await rea.execute({ args: ['--help'], timeoutMs: 120_000, maxOutputBytes: 512 }, {})
  if (spilled.ok !== true) {
    t.skip(`no usable REA runtime on this host: ${spilled.error?.code ?? spilled.exitCode}`)
    return
  }
  assertLosslessJson(spilled, 'spilled result')
  assert.equal(spilled.spilledStdout, true)
  assert.ok(existsSync(spilled.stdoutPath), 'the spilled file exists')
  const complete = readFileSync(spilled.stdoutPath, 'utf8')
  assert.equal(Buffer.byteLength(complete), spilled.stdoutBytes, 'the spilled file is the whole stdout')
  assert.ok(complete.length > spilled.stdout.length, 'the inline preview is shorter than the file')
  assert.ok(spilled.stdout.length <= 512 + 512, 'the preview honors the inline limit instead of a fixed head/tail')
  assert.ok(spilled.stdout.includes(spilled.stdoutPath), 'the preview names the complete file')
  assert.match(spilled.stdout, /characters kept at/)
  removeRecursiveSync(spilled.stdoutPath)
})

test('an unresolved runtime answers with remediation instead of throwing', async () => {
  const unresolved = {
    kind: 'unresolved',
    label: 'unresolved',
    remediation: 'Build the checkout: npm ci --engine-strict=false && npm run build:cached',
    rejected: [{ kind: 'checkout', label: 'F:/missing', reason: 'dist/cli.js is missing' }],
  }
  const result = await runResolved(unresolved, { args: ['--version'] })
  assertLosslessJson(result, 'unresolved result')
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'runtime_unresolved')
  assert.equal(result.error.rejected.length, 1)
})

test('the shipping validator rejects the undefined keys this plugin prunes', t => {
  if (runtimeValues === undefined) {
    t.skip('shipping @deepseek-ai/dsh-util-values not discoverable on this host')
    return
  }
  assert.equal(runtimeValues.isJsonValue({ ok: true, stdoutPath: undefined }), false,
    'this is the shape the live harness refused as "value is not lossless JSON"')
  assert.equal(runtimeValues.snapshotJsonValue({ ok: true, stdoutPath: undefined }), undefined)
  assert.equal(runtimeValues.isJsonValue({ ok: true }), true)
})

test('rea_doctor resolves the runtime and summarizes readiness', async t => {
  if (LIVE_DISABLED) {
    t.skip('DSH_REA_TEST_SKIP_LIVE=1 keeps this run off the network')
    return
  }
  const { ctx, captured } = fakeContext()
  apply(ctx, {})
  const doctor = captured.tools.find(tool => tool.name === 'rea_doctor')

  const report = await doctor.execute({ timeoutMs: 180_000 }, {})
  assertLosslessJson(report, 'rea_doctor report')
  if (report.resolved !== true) {
    t.skip(`no usable REA runtime on this host: ${report.remediation ?? ''}`)
    return
  }
  assert.equal(report.cliVersion, report.runtime.version)
  assert.ok(Array.isArray(report.checks), 'readiness checks are reported')
  assert.ok(Array.isArray(report.providers), 'provider candidates are reported')
  assert.ok(report.host.startsWith(process.platform))
  const rendered = doctor.output.render({}, report)
  assert.match(rendered[0].text, /REA runtime/)
})

/**
 * Assert a tool result survives lossless-JSON materialization.
 *
 * Tool results are snapshotted as lossless JSON, so an explicit `undefined`,
 * a non-finite number, a function, or a symbol is rejected by the registry
 * *after* the tool already ran — the failure the live harness reported once as
 * `tool "rea" returned invalid output: value is not lossless JSON`.
 */
function assertLosslessJson(value, path) {
  if (runtimeValues !== undefined) {
    assert.equal(runtimeValues.isJsonValue(value), true, `${path} is rejected by the shipping dsh-util-values validator`)
    assert.notEqual(runtimeValues.snapshotJsonValue(value), undefined, `${path} cannot be snapshotted`)
  }
  if (value === undefined) assert.fail(`${path} is an explicit undefined`)
  if (value === null) return
  const kind = typeof value
  if (kind === 'number') {
    assert.ok(Number.isFinite(value), `${path} is a non-finite number`)
    return
  }
  if (kind === 'string' || kind === 'boolean') return
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertLosslessJson(entry, `${path}[${index}]`))
    return
  }
  if (kind === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      assert.notEqual(entry, undefined, `${path}.${key} is an explicit undefined`)
      assertLosslessJson(entry, `${path}.${key}`)
    }
    return
  }
  assert.fail(`${path} holds a ${kind}`)
}

/** Walk one schema and assert the enforced subset, required/property agreement, and scalar enums. */
function assertSchema(node, path) {
  assert.ok(node !== null && typeof node === 'object', `${path} must be an object`)
  for (const key of Object.keys(node)) {
    assert.ok(ALLOWED_SCHEMA_KEYWORDS.has(key), `${path}.${key} is outside the enforced subset`)
  }
  if (node.required !== undefined) {
    assert.ok(Array.isArray(node.required), `${path}.required must be an array`)
    for (const required of node.required) {
      assert.ok(required in (node.properties ?? {}), `${path}.required lists unknown property ${required}`)
    }
  }
  for (const [key, child] of Object.entries(node.properties ?? {})) assertSchema(child, `${path}.properties.${key}`)
  if (node.items !== undefined) assertSchema(node.items, `${path}.items`)
  for (const branch of node.oneOf ?? []) assertSchema(branch, `${path}.oneOf[]`)
  if (node.enum !== undefined) {
    for (const entry of node.enum) {
      const kind = entry === null ? 'null' : typeof entry
      assert.ok(['string', 'number', 'boolean', 'null'].includes(kind), `${path}.enum holds a non-scalar`)
      if (node.type !== undefined && node.type !== 'null') {
        const matches = kind === node.type || (node.type === 'integer' && kind === 'number')
        assert.ok(matches, `${path}.enum entry ${JSON.stringify(entry)} is not a ${node.type}`)
      }
    }
  }
}