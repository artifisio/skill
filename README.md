# Artifisio skill

The harness-neutral [Agent Skill](https://agentskills.io) that teaches a coding
agent to find, theme and install open-licensed **illustrations, icons and
fonts** — and to generate a custom illustration style when nothing fits — with
[Artifisio](https://artifisio.com), through the `artifisio` CLI or the
`artifisio` MCP server. This repo is also a Claude Code plugin marketplace.

```
skills/artifisio/SKILL.md          the skill (+ references/cli.md, references/mcp.md)
commands/artifisio.md              /artifisio <brief>   (Claude Code plugin command)
.mcp.json                          MCP server config bundled with the plugin
.claude-plugin/                    plugin + marketplace manifests
```

## Install

**Any project, any harness** — the CLI detects the agents you use and writes
the right glue (skill, rules fragment, MCP config):

```bash
npx artifisio init --brand-color "#6366F1"
```

**Claude Code** (plugin: skill + `/artifisio` + MCP):

```
/plugin marketplace add artifisio/skill
/plugin install artifisio@artifisio
```

**Skill installers** (Codex, Cursor, Copilot, Gemini CLI, OpenCode, Windsurf, …):

```bash
npx skills add artifisio/skill
```

**By hand**: copy `skills/artifisio/` into your harness's skills directory
(`.claude/skills/`, `.agents/skills/`, `.github/skills/`, …) and add the MCP
server from `.mcp.json` to your host's MCP config. The key for generation is
stored once with `npx artifisio auth <key>`; discovery and installs need none.

## Licensing

The skill itself is MIT. The assets it installs carry their own licence:
CC BY 4.0 for registry illustrations and icons, SIL OFL 1.1 for registry fonts.
`artifisio add` writes the credits you owe into `ATTRIBUTION.md`.

## Source

This repo is a read-only mirror, published automatically from the Artifisio
monorepo on every change. File issues and feature requests here
([artifisio/skill/issues](https://github.com/artifisio/skill/issues)) — they
are triaged upstream. Docs: <https://artifisio.com/developers>.
