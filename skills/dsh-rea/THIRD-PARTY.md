# Third-party content

`dsh-rea` is a **DeepSeek Harness adapter**. It does not contain REA, and it is
not affiliated with the REA project.

## REA — https://github.com/morluto/rea

`rea-agents` and the REA CLI/MCP engine are by **morluto**, licensed MIT
(© 2026 morluto). Nothing from this plugin's side modifies REA:

- REA's **source, build output and binaries are not bundled here.** The plugin
  starts whatever REA install already exists on your machine (a built checkout,
  `rea` on `PATH`, or `npx rea-agents@<version>`), exactly as if you had typed
  the command yourself.
- The plugin neither installs nor upgrades REA, Node.js, or any analysis engine
  (Hopper, Ghidra, IDA, JADX). Engines are bring-your-own.

### Bundled skill text

`skills/reverse-engineer-anything/` (the `SKILL.md` plus the five documents
under `references/`) is **derived from REA's own agent skill**, which REA
generates at `.agents/skills/reverse-engineer-anything/` and ships in its
`skills/` build output. Upstream text is MIT (© 2026 morluto) and is reproduced
here with attribution under that license.

Local changes to that text, and only these:

- the "Connect only when needed" section was rewritten for DSH — the two tools
  registered by this plugin *are* the registration, so the skill no longer tells
  an agent to run `rea setup` or hand-edit an MCP client config;
- a note under "Route the target first" maps REA's MCP tool names to the CLI
  command names DSH actually drives, and calls out the three session tools
  (`open_binary`, `close_binary`, `binary_session`) that have no CLI counterpart;
- the frontmatter `description` gained one sentence naming the `rea` /
  `rea_doctor` tools.

To refresh it, rebuild REA (`npm run build:cached` in the REA checkout) and copy
the regenerated `skills/reverse-engineer-anything/` back over this repository's
copy. Upstream is the source of truth for that text; report content problems to
[`morluto/rea`](https://github.com/morluto/rea), not here.

## No other third-party code

The plugin itself has **no dependencies** — no npm packages, no `@deepseek-ai/*`
imports, no vendored libraries. It uses only Node.js built-ins.

## Licenses

| Content | License |
|---|---|
| `index.js`, `lib/`, `cordis.patch.yml` | MIT © 2026 zhaofeng130 — see [LICENSE](LICENSE) |
| `skills/reverse-engineer-anything/` (derived) | MIT © 2026 morluto — https://github.com/morluto/rea/blob/main/LICENSE |
| REA (not bundled) | MIT © 2026 morluto — https://github.com/morluto/rea/blob/main/LICENSE |