# dsh-rea

**Reverse engineering in DeepSeek Harness, powered by REA.**
Register the `reverse-engineer-anything` skill plus two tools — `rea` and `rea_doctor` — in every session, so an agent can drive the local [REA](https://github.com/morluto/rea) CLI for binaries, Electron/ASAR bundles, Android packages, firmware and archives.

**把 REA 接进 DeepSeek Harness：** 每个会话都能拿到 `reverse-engineer-anything` 技能，以及 `rea`、`rea_doctor` 两个工具，用于二进制、Electron/ASAR、Android 包、固件与归档产物的逆向分析。

> 本插件是 **DSH 适配层**，不包含 REA 本体，与 REA 项目无隶属关系。REA 由 [morluto](https://github.com/morluto/rea) 开发（MIT），本插件只负责把它接进来——安装它不会改动你的 REA，也不会替你装 REA。技能正文源自 REA 自带的技能文档，署名见 [THIRD-PARTY.md](THIRD-PARTY.md)。

## 它给你什么

| 注册项 | 名字 | 说明 |
|---|---|---|
| Skill | `reverse-engineer-anything` | 逆向任务的选路与取证纪律：先按目标类型选命令、大 Evidence 走落盘、结论必须落在 evidence 上 |
| Tool | `rea` | 执行一次 REA CLI 调用（`args` 数组），返回 stdout / stderr / 退出码 / 耗时；超出内联上限的 stdout 落盘并给出路径 |
| Tool | `rea_doctor` | 解析运行时可执行入口，汇总 REA 版本、分析引擎（Hopper/Ghidra/IDA）可用性、capability 目录与技能标识 |

真实输出（本机实测）：

```
$ rea --version
6.3.0

$ rea_doctor
REA runtime: REA checkout /path/to/rea (6.3.0)
host: win32 x64  node: v24.18.1  rea: 6.3.0
healthy: false
ok   node - 24.18.1
ok   host - win32 x64
fail ghidra [missing_analysis_engine] - GHIDRA_INSTALL_DIR is not set
provider ghidra: unavailable - Set GHIDRA_INSTALL_DIR to an extracted Ghidra 12.1.x release directory.
catalog: 95 CLI commands, 139 MCP tools, 6 prompts
skill: reverse-engineer-anything v35
```

`healthy: false` 是正常现象：分析引擎是 bring-your-own，没配 Ghidra/IDA 只影响需要它们的任务（原生伪代码），不影响纯静态的 JS / 归档 / 固件区域分析。

## 安装

```sh
# 从 GitHub 源码装（本仓库零依赖、无构建步骤）
dsh plugin --profile <profile> add github:zhaofeng130/dsh-rea

# 或装 Release 里的预构建 tarball
dsh plugin --profile <profile> add https://github.com/zhaofeng130/dsh-rea/releases/latest/download/dsh-rea.tgz
```

在 dsh-market 里搜 `dsh-rea` 一键装也可以。装完开新会话（bundle 层在启动时组合）。

## 前置：本机要有 REA

插件**不会**替你安装 REA，也不会改动它。运行时按下面的顺序找一个可用的入口，第一个能跑通 `--version` 的胜出：

1. 配置里的 `cliPath`（或环境变量 `DSH_REA_CLI`）——`.js/.mjs` 用当前 node 跑，其它当可执行文件
2. 已构建的 REA checkout：`<repoPath>/dist/cli.js` 存在时用 `node <repoPath>/scripts/rea.mjs`
3. `PATH` 上的 `rea`
4. `npx --yes rea-agents@<版本>`（同目录有 `npm/bin/npx-cli.js` 时优先用它，避开 Windows 批处理 shim）

全都不可用时，`rea` 返回 `error.code = "runtime_unresolved"` 并附上处理建议，`rea_doctor` 会逐条列出被拒的候选与原因——不会假装成功。

拿到 REA 的方式（任选）：`npm i -g rea-agents`；或克隆 [morluto/rea](https://github.com/morluto/rea) 后在仓库里 `npm ci && npm run build:cached`，再用 `repoPath` 指过去。REA 的 engines 要求 node `^22.19.0 || ^24.11.0 || >=26.0.0`。

## 配置

全部可选。写在 profile 的 `cordis.patch.yml` 对应行里，或用环境变量覆盖：

| config | 环境变量 | 默认 | 含义 |
|---|---|---|---|
| `repoPath` | `DSH_REA_REPO` | 自动发现 `<插件>/../../rea`、`<插件>/../rea` | 指定 REA checkout |
| `cliPath` | `DSH_REA_CLI` | — | 直接指定入口 |
| `skillsDirs` | — | `[]` | 额外技能根目录，优先级高于插件内打包的那份 |
| `npxPackage` | `DSH_REA_NPX_PACKAGE` | `rea-agents` | 兜底 npm 包名 |
| `npxVersion` | `DSH_REA_NPX_VERSION` | checkout 的版本，否则 `latest` | 兜底版本 |
| `timeoutMs` | `DSH_REA_TIMEOUT_MS` | `600000` | 单次调用超时（超时会 `taskkill /pid /t /f`，不留分析进程） |
| `maxOutputBytes` | `DSH_REA_MAX_OUTPUT_BYTES` | `262144` | 内联 stdout 上限，超出落盘到 `$DSH_HOME/dsh-rea/spill/` |

```yaml
# <profile>/cordis.patch.yml
- id: dsh-rea
  name: dsh-rea
  config:
    repoPath: D:/src/rea
```

## 实现要点

- **零依赖纯 JS**：不 import `@deepseek-ai/*`，只用 Node 内置模块，因此安装不需要构建授权（`allowBuilds`），也不怕宿主升级。
- **子进程捕获走文件描述符而非管道**：受控 Windows 沙箱下管道会 EPERM，且 REA 的 Evidence 动辄上百 MB。超过内联上限就直接落盘，预览严格受 `maxOutputBytes` 约束，不会反过来比原文还长。
- **工具返回值必须是无损 JSON**：显式 `undefined` 属性会被宿主判为 `value is not lossless JSON`，所以每个可选字段都经过 `pruneUndefined`。
- **不用 `fs.rmSync` 清临时目录**：Windows 上 `fs.rmSync` 对含非 ASCII 的路径是**静默空操作**（用户目录名是中文时全中招），改用 `unlinkSync`/`rmdirSync` 递归删除，并有回归测试守住。
- **挂载即校验**：打包的技能缺失、名字非 kebab-case、缺 `description` 都会在挂载时报错，而不是服务一个空目录。
- **工具 schema 只用受支持子集**：仅 `type/properties/required/additionalProperties/items/enum` 与注解，测试逐节点断言，防止越界关键字让注册失败。

## 测试

```sh
node --test        # 12 个用例
```

覆盖：挂载形状、schema 子集、技能解析与根目录优先级、参数拼装（JS 入口与 Windows 批处理 shim）、非 ASCII 路径递归删除、落盘预览、无损 JSON 契约，以及对真实 REA checkout 的端到端调用（`rea --version`、触发落盘的 `rea --help`、`rea_doctor`）。没有可用 REA 时相关用例自动 skip。检测到宿主自带 `@deepseek-ai/dsh-util-values` 时，还会用它的 `isJsonValue`/`snapshotJsonValue` 校验工具返回值。

**实测宿主**：dsh 0.2.0-rc.2（Windows）。插件只依赖 `ctx.skills.registerProvider` 与 `ctx.tools.register` 两项契约；这两个契约在 0.1.5-rc.2 的源码里逐字段比对一致（候选/定义字段、rank 600、schema 子集），但未在 0.1.x 实跑。因此**没有**声明 `engines.dsh` 范围——声明错了会被市场静默判成不兼容，而未声明的条目照常可见。

## 目录结构

```
dsh-rea/
├── index.js                 # 入口：注册技能 provider 与两个工具
├── lib/options.js           # 配置合并 + checkout 发现
├── lib/runtime.js           # 运行时解析、子进程调用、落盘、递归删除
├── lib/skills.js            # SKILL.md 解析与 provider
├── lib/tools.js             # rea / rea_doctor 定义与渲染
├── skills/reverse-engineer-anything/   # 打包的技能（源自 REA，署名见 THIRD-PARTY.md）
├── cordis.patch.yml         # bundle 补丁层
└── test/plugin.test.mjs     # node:test 用例
```

## English quickstart

```sh
dsh plugin --profile <profile> add github:zhaofeng130/dsh-rea
```

Registers the `reverse-engineer-anything` skill and two tools: `rea` (one REA CLI
invocation — command and arguments as an array; stdout above the inline limit is
spilled to disk and returned as `stdoutPath`) and `rea_doctor` (runtime
resolution plus REA readiness). REA itself is **not** bundled and never modified;
the plugin resolves a local entry point in the order `cliPath` → built checkout →
`rea` on `PATH` → `npx rea-agents`, and answers with
`error.code: "runtime_unresolved"` plus remediation when none of them responds.
Zero dependencies, no build step, no `@deepseek-ai/*` imports. Tested against
dsh 0.2.0-rc.2 on Windows.

## License

插件代码 MIT © 2026 zhaofeng130（[LICENSE](LICENSE)）。打包的技能正文源自 REA（MIT © 2026 morluto），署名与改动清单见 [THIRD-PARTY.md](THIRD-PARTY.md)。REA 本体不在本仓库内。