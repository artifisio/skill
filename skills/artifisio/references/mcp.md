# Artifisio MCP tools — reference

The `artifisio` MCP server is a peer of the CLI: same core, same safety rails,
same three registries (illustrations, icons, fonts). Two transports:

- **stdio** (`npx -y @artifisio/mcp`): runs inside the project and writes files
  exactly like the CLI. Honours `--project-dir <dir>` / `ARTIFISIO_PROJECT_DIR`
  and the same `~/.artifisio/config.json` credentials as `artifisio auth`
  (browser sign-in or API key).
- **hosted** (`https://artifisio.com/api/mcp`): for hosts without a shell.
  Sign in through the host's OAuth prompt, or send an
  `Authorization: Bearer artf_…` header — one of the two is required. Never
  writes files — `add` returns the `npx artifisio add …` command and CDN URLs.

The server registers **exactly six tools**: `search`, `show`, `facets`, `add`,
`quote`, `generate`. The CLI's `init`, `styles`, `ls`, `update`, `remove`,
`doctor`, `models`, `auth` and `whoami` have **no MCP equivalent** — run them
with `npx artifisio …` in a shell.

Every tool returns a JSON text block with the same fields as the CLI `--json`
payload of the same name, plus inline images where noted. Errors carry a
`code` (`insufficient_credits`, `over_budget`, `no_api_key`, `not_found`,
`network`, `offline_no_cache`, `offline_network_required`) and a remediation
sentence.

| Tool | Input | Output |
|---|---|---|
| `search` | `query`, `kind?` (`illustration` \| `icon` \| `font` \| `all`, default `all`), `color?` (hex), `tag?` (comma-separated, all must match), `limit?` (5, max 25), `previewCount?` (3, max 8) | `{ query, kind, registryVersions, unavailable?, results[] }` + an inline preview image for the first `previewCount` results |
| `show` | `slug`, `kind?` (`illustration` \| `icon` \| `font`; default probes all) | the `show` payload (palette, themeable slots, items, `install`, `installWithColors`) + cover image. For an icon set the icons come back in the `items[]` array |
| `facets` | `kind?` | tags, themeable slots, background counts, font scripts/weights, icon grids/strokes |
| `add` | `slug`, `kind?`, `autoColor?` (hex list), `colors?` (`{ slot: hex }`), `bake?`, `format?`, `emit?`, `dir?`, `dryRun?`, `projectDir?` (stdio) | stdio: the `add` payload (`status`, `outDir`, `autoColors`, `attributionFile`, …) plus `projectDir`. Hosted: `{ slug, kind, name, command, license, files[], warnings[] }` |
| `quote` | `useCase` (`illustration` \| `edit` \| `style`), `model?`, `count?`, `withReferenceImage?` | `{ estimatedCreditsMin, estimatedCreditsMax, creditsRemaining, sufficient }` |
| `generate` | `useCase`, `prompt`, `style?` (required for `illustration`), `model?`, `count?`, `imageUrls?`, `enhance?` (style), `saveAs?` (style), `maxCredits?`, `dryRun?`, `download?` (stdio), `inlineImages?`, `projectDir?` | the matching CLI `generate` payload + inline images; after `saveAs`, a `next` hint with the `add … --private` command (private sets are installed through the CLI) |

Notes that bite:

- `search`'s `tag` is the only filter the MCP layer has. There is no
  `themeable`, `hasBackground` or `private` filter — those live on the CLI's
  `styles` command.
- Hosted `add` builds its `command` from `colors` / `autoColor` / `format` /
  `bake` only; if you passed `dir` or `emit`, add them to the command yourself.
- `generate` covers illustration use-cases only (`illustration`, `edit`,
  `style`). There is no icon or font generation on either surface.
- Previews are rasterised from SVG when the optional `sharp` dependency is
  present. Icon and font sets preview as SVG, so **without `sharp` they come
  back as URLs only** — fetch and view them yourself before choosing.

Resources: `artifisio://registry/index` (root index of every kind),
`artifisio://registry/{kind}/manifest`, `artifisio://registry/{kind}/sets/{slug}`.

Safety parity with the CLI: every `generate` is quoted first and refused when
the estimate exceeds `maxCredits` (or the project's
`defaults.maxCreditsPerCall`) or the balance; spends are logged to
`~/.artifisio/spend.log`. Discovery tools need no key; keys are minted at
<https://artifisio.com/profile>.

Host configuration snippets (stdio):

```json
{ "mcpServers": { "artifisio": { "command": "npx", "args": ["-y", "@artifisio/mcp"] } } }
```

`npx artifisio init` writes the right file for each detected harness.
