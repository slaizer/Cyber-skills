# Multi-agent workflows: many cheap workers, one careful lead

Co-op work splits naturally: one agent per subsystem audit, one per bug, one per level
test, one per research slice. The pattern that worked across our projects is a lead agent
on the strongest model that plans, verifies and merges, and worker agents on a cheaper,
faster model (we used Claude Sonnet) that do bounded jobs.

## The pattern

1. **Fan out read-only first.** One worker per subsystem or per bug, read-only, each
   returning findings with file and line, how a player hits it, and confidence.
2. **Lead verifies claims.** About one finding in six was wrong in our Deus Ex audit. Never
   fix from an unverified claim.
3. **Implement with isolation.** Each worker gets its own copy of the fix package, its
   own test install, its own network port and its own logs. Shared state (files, ports,
   pipe names, the game window) causes cross-talk. Launch scripts only kill processes
   under their own folder.
4. **Merge after green.** Workers don't commit to the main tree. The lead merges, renames
   clashes (two workers created classes with the same name), rebuilds and reruns the whole
   suite.
5. **Adversarial review.** A skeptical worker reviews each change and can revert it.
6. **Mind the machine.** Every worker running game clients costs memory. Run test-heavy
   workers one at a time on a normal PC; research and code-reading workers are cheap.

Good worker prompts are self-contained: the goal, the workspace path, the exact commands
to build and test, the rules (no em dashes in docs, no personal info), what to return, and
what not to touch.

## Tool by tool

Config keys below were checked in each tool's docs in October 2026. Tools change; check
the linked docs if something doesn't work.

### Claude Code

- Workers: the Agent tool takes a `model` parameter (`sonnet`, `opus`, `haiku`), or define
  agents as Markdown files with YAML frontmatter in `.claude/agents/` with `model: sonnet`.
  Frontmatter also takes `tools`, `isolation: worktree` (own git worktree) and
  `background: true`.
- One model for all workers: `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` (plus
  `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`) in the `env` block of `settings.json`.
- Concurrency: `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (default 20),
  `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (default 3).
- Long test runs in the background may be stopped when the system is low on memory;
  starting Claude Code with `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1` turns that off.
- Docs: https://code.claude.com/docs/en/sub-agents

### OpenAI Codex CLI

- Raise parallel agents in `config.toml`:
  ```toml
  [agents]
  max_concurrent_threads_per_session = 12   # older versions: max_threads (default was 6)
  default_subagent_model = "<cheaper model>"
  ```
- Custom agents: TOML files in `.codex/agents/` with `name`, `description`,
  `developer_instructions` and optionally `model`.
- Launch by asking: "spawn one agent per bug, wait for all, return a table".
- Docs: the Codex configuration reference, section `agents`.

### Gemini CLI

- Subagents as Markdown in `.gemini/agents/` with `model`, `tools`, `max_turns`. No
  documented concurrency setting; subagents can't spawn subagents.
- To read this repo's rules, set the context file name to `AGENTS.md` in
  `.gemini/settings.json`.

### Cursor

- Background (cloud) agents run in parallel from the editor, the web or the API. Reads
  `AGENTS.md`.

### OpenCode

- Agents in `.opencode/agents/` or `opencode.json` with `mode: subagent` and a `model`.

### Aider

- No built-in parallel agents: run several aider processes in separate worktrees. Use
  `--read AGENTS.md` to load the rules.

## Workflows (scripted orchestration)

Some tools can run a script that launches dozens of agents deterministically (pipelines
like "review each subsystem, then verify each finding"). Use that for big audits and
sweeps, e.g. one agent per level for a full-campaign test. Keep the size to what the
machine and your budget can take, and still have the lead verify the merged result.
