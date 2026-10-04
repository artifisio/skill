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
| `add` | `slug`, `kind?`, `private?` (your private sets: illustrations, icons with `kind: "icon"` or fonts with `kind: "font"`), `autoColor?` (hex list), `colors?` (`{ slot: hex }`), `bake?`, `format?`, `emit?`, `dir?`, `dryRun?`, `projectDir?` (stdio) | stdio: the `add` payload (`status`, `outDir`, `autoColors`, `attributionFile`, …) plus `projectDir`. Hosted: `{ slug, kind, name, command, license, files[], warnings[] }` |
| `quote` | `useCase` (`illustration` \| `image` \| `edit` \| `style` \| `logo` \| `icons` \| `font`), `model?`, `count?` (`font`: the candidates), `icons?` (for `icons`, quoted at `icons.length`), `withReferenceImage?`, `referenceImages?` (how many reference images, each priced), `aspectRatio?`, `size?` | `{ estimatedCreditsMin, estimatedCreditsMax, creditsRemaining, sufficient }` |
| `generate` | `useCase`, `prompt`, `style?` (required for `illustration`), `name?` / `tagline?` / `colors?` (logo explore), `logoId?` + `concept?` (logo finalize), `icons?` + `fill?` + `accent?` + `stroke?` + `iconSetId?` (icons; `name` is the set name), `fontId?` + `candidate?` + `charset?` (font; `name` is the family name), `model?`, `count?`, `imageUrls?` (required for `edit`), `aspectRatio?` / `size?` (image, edit; `size` is the sheet resolution for icons), `enhance?` (style), `saveAs?` (style), `maxCredits?`, `dryRun?`, `inlineImages?`, stdio only: `download?`, `projectDir?` | the matching CLI `generate` payload + inline images; after `saveAs`, a `next` hint with the `add … --private` command (private sets are installed through the CLI) |

Notes that bite:

- `search`'s `tag` is the only filter the MCP layer has. There is no
  `themeable`, `hasBackground` or `private` filter — those live on the CLI's
  `styles` command.
- Hosted `add` builds its `command` from `colors` / `autoColor` / `format` /
  `bake` only; if you passed `dir` or `emit`, add them to the command yourself.
- `generate` covers illustration use-cases (`illustration`, `image`, `edit`,
  `style`) and logo concepts (`logo`: `name` + the brief as `prompt`, optional
  `tagline` / `colors`; returns `{ id, concepts[] { index, direction, url },
  contactSheetUrl, next }`, quoted at 4 unless `count` says otherwise — show
  the user a table with each `url` as a link plus the contact sheet), and their
  brand pack (`logo` + `logoId` + `concept`; stdio writes it to `public/brand`
  and adds `head`; hosted waits up to 45 seconds, then answers
  `status: "finalizing"` with `retryAfterSeconds` — call again then for the
  file URLs, a zip and the free `npx artifisio logo finalize … --out <dir>`
  download command; follow `next`, since a call made while another concept is
  building starts a charged build of yours once it is done). Calling again for a
  built or building concept never charges twice; `totalCostInCents` is always
  what the pack cost. A failed build (`code: "finalize_failed"`, e.g. a
  misspelt wordmark) is reported on every call until you tell the user and
  pass `retry: true`.
- `useCase: "icons"`: the style brief as `prompt` plus `icons` (names or
  `{ name, hint }`), optional `fill` / `accent` / `stroke`. The result is the
  user's private icon set: `{ id, status: "ready", slug, icons[] { name, svgUrl },
  missing, extras[] { name, svgUrl }, manageUrl, sheetUrl, totalCostInCents, next }`;
  `extras` filled the rest of the sheet and are not in the set (to keep one,
  restore it at `manageUrl`); install it with `add` and
  `kind: "icon"`, `private: true` (hosted: run the `npx artifisio add … --kind
  icon --private` command in `next`). A run takes about three minutes, so a call answers
  `status: "generating"` after 45 seconds — call again with `iconSetId` after
  `retryAfterSeconds`, which is free (stdio then saves the SVGs under
  `generations/icons/<id>`). `code: "in_progress"` means an icon set is already
  generating for the account; its `id` is in the error, collect it with
  `iconSetId`.
- `useCase: "font"`: the brief as `prompt`, the family name as `name` (never a
  trademarked font name), `count` candidates (default 4, max 4). The result
  lists `candidates[] { index, url }` (inline images too) and `recommended`:
  show the user every candidate as a link, recommend one, let them choose, then
  call with `fontId` + `candidate` to build it (charged; free when that
  candidate is built). The build answers `{ slug, family, files { otf, woff2 },
  specimenUrl, missing, totalCostInCents, next }`; install it with `add` and
  `kind: "font"`, `private: true`. Each step answers `status: "generating"`
  after 45 seconds — call again with `fontId` (plus `candidate` for the build)
  after `retryAfterSeconds`, free. A failed build is reported
  (`finalize_failed`) until you pass `retry: true`.
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
