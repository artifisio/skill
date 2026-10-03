# Artifisio CLI — command and output reference

Every command, flag and JSON field. `SKILL.md` covers the workflow; come here
for a specific flag, format token or payload shape. Invoke as
`npx artifisio <command>`; add `--json` for the machine-readable envelope.
`npx artifisio <command> --help` is always authoritative for the flags of the
version you have; the published reference lives at
<https://artifisio.com/developers>.

## Envelope, exit codes, global flags

- Success: `{ "apiVersion": 1, "ok": true, … }`.
  Error: `{ "apiVersion": 1, "ok": false, "error": "<human message with next steps>", "code"?: "<machine code>" }`.
- Exit 0 success · 1 error · 2 `insufficient_credits`.
- `code` is emitted for `insufficient_credits`, `offline_no_cache`,
  `offline_network_required` and `registry_not_published` (a registry repo
  that is missing, private or empty — the other kinds still work). Everything
  else (not found, over budget, bad hex, network failure) is a plain error
  line — read `error`, which carries the remediation. (The MCP server adds
  `over_budget`, `no_api_key`, `not_found` and `network`; see
  `references/mcp.md`.)
- Global flags: `--offline` (cached manifests only, no network),
  `-V/--version`, `-h/--help`.
- `--kind illustration|icon|font|all` on the discovery commands `search`,
  `styles`, `facets` (`all` is the default);
  `--kind illustration|icon|font` on `show` and `add` (no `all` — they resolve
  one slug; default: probe every registry in that order, first hit wins).
  `ls`, `update`, `remove` and `doctor` take no `--kind` — they read it from
  `.artifisiorc.json`. **Pass `--kind` explicitly on `show`/`add`** whenever
  you know it: it skips the probe and removes the ambiguity of a slug that
  exists in two registries.

## Format tokens

Illustrations: `svg`, `png`, `png@2x`, `png@3x`, `webp`, `jpg`, `pdf`.
Fonts: `woff2`, `otf`, `ttf`. Comma-separated in `--format`, or `all`.
Icons ship SVG only — `--format` accepts `svg` or `all` and errors on anything
else, before any file is written.
Colour overrides apply to `svg`/`pdf` for illustrations; icons are always SVG,
so they always recolour; fonts have no palette.

## Shared row shape (`search`, `styles`, `show`)

| Field | Meaning |
|---|---|
| `slug`, `kind` (`illustration` \| `icon` \| `font`), `name`, `description`, `tags[]`, `count` | set meta |
| `formats[]` | available variants (illustrations), `["svg"]` (icons) or shipped font formats |
| `palette[] { slot, label, hex, role: themeable \| fixed }`, `themeableSlots[]` | illustrations **and icons**; `[]` for fonts |
| `hasBackground` | illustrations only, when known |
| `preview` | CDN URL of the cover (fonts: `specimen.svg`), may be `null` |
| `previewLocal` | absolute path — only with `--save-previews <dir>` |
| `license` (SPDX), `attributionRequired`, `attribution` | resolved licence (CC BY 4.0 illustrations + icons, OFL 1.1 fonts) |
| `source` | GitHub URL of the set |
| `install` | ready-to-run `artifisio add …` line (carries `--kind` for icons/fonts) |
| `family`, `styles[] { name, weight, italic? }`, `scripts[]`, `stylesheet` | fonts only |
| `grid` (design box in px), `stroke` (nominal width), `sprite` (CDN URL, only when the set ships one) | icons only |
| `score`, `matchedOn[]` | `search` only. `matchedOn` values: `slug`, `name`, `tags`, `description`, `illustrations` \| `icons` \| `styles` (item match, named after the kind), `palette`, `color` |
| `paletteDistance` | with `--color`: RGB distance to the closest palette entry |

`show` adds `items[] { slug, premium, formats[], preview, previews { <fmt>: url } }`
and `installWithColors`. **For an icon set the icons are projected into that
same `items[]` array** (icons and illustrations share an item shape);
it is `[]` for fonts, and `installWithColors` is `null` for fonts.
One slug → fields at top level; several → `{ sets: [...] }`.

## Discovery (no auth)

### `search <query>`
`--kind`, `--limit <n>` (10), `--save-previews <dir>`, `--color <hex>`,
`--local` (skip the hosted API and rank cached manifests), `--json`.
Payload: `{ query, kind, source: "api" | "local", registryVersions, unavailable?, results: Row[] }`.
An empty query with `--color` ranks by colour alone.

### `sets [query]`
`--kind`, `--tag <a,b>` (all must match), `--themeable`, `--has-background` /
`--no-background`, `--color <hex>` (RGB distance ≤ 50, closest first),
`--private` (key owner's private illustration styles), `--limit <n>`, `--json`.
Payload: `{ kind, registryVersions, unavailable?, styles: Row[] }` — note the
key is `styles`, not `results`, and it lists icon sets and font families too.
`--themeable` and `--color` match illustration **and** icon sets;
`--has-background` / `--no-background` are illustration-only.

### `show <slug...>`
`--kind`, `--save-previews <dir>`, `--json`. Unknown slug → exit 1 with a
"not found in any registry" message.

### `facets`
`--kind`, `--json`. Payload: `{ kind, registryVersions, setCount, kinds { illustration, icon, font }, tags[], tagCounts, themeableSlots[], themeableSlotCounts, hasBackground { true, false }, scripts { <script>: families }, weights { <weight>: styles }, grids { <px>: sets }, strokes { <width>: sets } }`.
Kind-specific buckets are always present and empty when no set of that kind
matched. (The text renderer prints only the shared buckets — use `--json` for
`grids`/`strokes`.)

### `models`
`--json`. Payload: `{ defaultModel, models[] { id, label, family, pricing, pricingHint?, metrics?, requiresInputImage?, isDefault?, recommendedFor? { useCase, rank }[] }, source: "api" | "fallback", warning? }`.
`recommendedFor` names the use cases (`illustration`, `image`, `free-edit`, `style-creation`, …) a model suits best; rank 1 is what runs when that use case's command gets no `-m`. `logo-finalize` always reuses the model the logo was explored with.

## Project setup

### `init`
Writes `.artifisiorc.json` (if missing), adds `.artifisio-cache/` to
`.gitignore`, and writes the agent glue (this skill + MCP config) for every
coding-agent harness it detects in the project.
`--harness <list|all>` (`claude-code,cursor,codex,copilot,gemini,windsurf,opencode,cline`),
`--brand-color <hex[,hex]>` (saved as `brand.colors`, auto-applied by `add`),
`--output-dir <dir>` (default `./public/illustrations`; icons and fonts land in
siblings of it), `--max-credits <n>` (`defaults.maxCreditsPerCall`, default 30),
`--no-mcp`, `--dry-run`, `--json`.
Payload: `{ dryRun, root, detected[], harnesses[], config { path, action }, files[] { path, action: created | updated | unchanged | skipped, harness? }, notes[] }`.
Idempotent: fragments are bracketed by `<!-- artifisio:start/end -->`
markers, JSON/TOML configs are merged, nothing of yours is removed.

## Install and manage

### `add <set>`
`--kind`, `--private`, `--dir <dir>`, `--colors "slot=#hex,…"`, `--strict`,
`--bake`, `--format <list|all>`, `--emit none|ts|dts`, `--registry-version <ref>`,
`--auto-color "#hex[,…]"`, `--preview-colors <dir>`, `--cdn` (print CDN URLs,
write nothing), `--dry-run`, `--json`.
Payload: `{ ok, status: installed | updated | unchanged, slug, kind, dryRun, downloaded, skipped, errors[] { file, message }, missingVariants[], plannedFiles, emit, indexFile, autoColor, autoColors[] { slot, label, hex, appliedHex, distance }, outDir, license, attributionRequired, attribution, attributionFile }`.

Install layout per kind (all relative to `.artifisiorc.json#outputDir`, default
`./public/illustrations`; `--dir` overrides per set):

- **Illustrations** → `<outputDir>/<slug>/`: one file per illustration ×
  requested format.
- **Icons** → `<dirname(outputDir)>/icons/<slug>/` (default
  `./public/icons/<slug>`): one flat `<icon>.svg` per icon, always SVG, plus
  `sprite.svg` when the manifest ships one. Colour flags apply.
- **Fonts** → `<dirname(outputDir)>/fonts/<slug>/` (default
  `./public/fonts/<slug>`): `<slug>-<style>.<fmt>` files plus `<slug>.css`;
  colour flags are ignored.

`missingVariants[]` is `"<item>@<fmt>"` for illustrations and fonts; icons push
the bare icon slug (an icon that ships no SVG at all).

Premium items are listed in the registry but excluded from a free install
(illustrations and icons); the JSON reports how many were withheld.

`--cdn` payload: `{ mode: "cdn", slug, kind, <rows>, premiumSkipped, license, attributionRequired, attribution }` where `<rows>` is
`illustrations` (illustrations), `icons` (icon sets, sprite last) or `files`
(fonts, stylesheet first).

`--preview-colors` is **illustration-only** — it throws on icon and font sets.
Payload: `{ mode: "preview-colors", slug, illustrationSlug, previewPath, colors, autoColors }`.

### `update <set...>`
`--dry-run`, `--keep-orphans`, `--format`, `--registry-version <ref>`, `--json`.
One line per slug, either `{ slug, upToDate: true, added: 0, changed: 0, removed: 0, skipped: 0 }`
or `{ ok, slug, dryRun, added, changed, removed, skipped, errors[], missingVariants[], attributionFile }`.
Not installed → `{ ok: false, error, slug }`. Works for all three kinds; the
kind comes from `.artifisiorc.json`. When the set directory already has an
`index.ts` / `index.d.ts`, `update` regenerates it so the typed exports match
the files on disk.

### `ls`
`--json` → `{ sets[] { slug, kind, source, name?, license?, version?, formats?, colors? } }`.

### `remove <set...>` (alias `rm`)
`--keep-files`, `--json`. Deletes the set's directory and config entry,
regenerates `ATTRIBUTION.md`. Ends with an aggregate line
`{ ok, slugs[], filesRemoved, attributionFile }`.

### `doctor`
`--network`, `--json`. `{ ok, issues[] { set, kind: resolve | manifest-drift | missing | hash, detail }, warnings[] { set, kind: stale | unknown-color, detail } }`;
with `--network`: `{ ok, network { ok, checks { manifest, cdn, api } } }`. Exit 1 when `ok` is false.
Checks all three kinds: illustration variants, icon SVGs (and `sprite.svg`),
font files plus `<slug>.css`. `--network` probes the raw manifest and the CDN
mirror of **every** registry kind plus the API, so a 404 on one kind is visible
even when the others are healthy.

## Generation (API key + credits) — illustrations, images, icon sets, fonts and logos

`generate illustration <style>` · `generate image` · `generate edit` · `generate style`

These use-cases produce raster artwork (`image` binds to no style); icon sets
are `generate icons` and typefaces `generate font` (below).

Common: `-p/--prompt <text>` (required), `-m/--model <id>`, `-n/--count <n>`,
`-o/--out <dir>` (default `./generations/<timestamp>`), `--no-download`,
`--dry-run` (quote only), `--max-credits <n>`, `--no-preflight`, `--json`.
`illustration` / `image` / `edit`: `-i/--image <url...>`, `--image-file <path...>`
(`edit` needs at least one).
`image` / `edit`: `--aspect <ratio>` (`1:1` `3:2` `2:3` `4:3` `3:4` `16:9` `9:16` `21:9`),
`--size 1K|2K|4K` — the nearest the model supports (`models --json` lists
`aspectRatios` / `sizes`).
`illustration`: `--iteration`, `--no-style-grid`.
`style`: `--enhance none|concept|planned` (concept), `--save-as <name>`,
`--then-add`, `--then-generate <prompt>`.

Payloads:
- `--dry-run`: `{ dryRun: true, quote { useCase, modelId, count, estimatedCreditsMin, estimatedCreditsMax, creditsRemaining, sufficient } }`.
- `illustration`: `{ images[], id?, savedTo[] | null, totalCostInCents }`.
- `image` / `edit`: `{ images[], id?, savedTo, totalCostInCents }`.
- `style`: `{ images[], id?, prompt, rawPrompt, savedTo, totalCostInCents, savedAs { slug, id, installHint } | null, added { status, outDir } | null, firstIllustration { images, savedTo, totalCostInCents } | null }`.

`generate icons -p <style brief> --icon <name|name=hint>...` generates an icon
set on one sheet, traced to SVG and saved as your private icon set:
`--fill outline|solid|duotone`, `--accent "#hex"` (duotone), `--stroke <n>`,
`--name <set name>`, `--size 1K|2K|4K` (sheet), `-m`, `-o <dir>` (default
`./generations/icons/<id>`), `--no-download`, `--dry-run`, `--max-credits`,
`--no-preflight`, `--json`. The quote's `count` is the number of icons, priced
as one sheet. It waits for the run (~3 minutes); `--collect <id>` picks up a
run started earlier, free. Payload: `{ id, name, slug, icons[] { name, svgUrl },
missing[], sheetUrl, palette, savedTo[] | null, totalCostInCents }`. Install it
with `add <slug> --kind icon --private`. A second set while one is generating
fails with `code: "in_progress"`.

`generate font -p <brief>` explores a typeface: `-n 1..4` candidates (default
4, also what the preflight quotes), `--name <family>` (a trademarked font name
is refused), `--charset latin-text|latin-core|latin-caps`, `-m`, `-o <dir>`
(default `./generations/fonts/<id>`), `--no-download`, `--dry-run`,
`--max-credits`, `--no-preflight`, `--json`. Payload: `{ id, name, model,
charset, candidates[] { index, url }, recommended, savedTo, totalCostInCents }`;
`--collect <id>` picks the candidates up, free. `generate font --finalize <id>
--candidate <n> [--name <family>]` builds the font from one candidate (quoted
as `font-finalize`; free when that candidate is built, and `--name` then
ignored): `{ id, candidate,
reused, name, family, slug, files { otf, woff2 }, specimenUrl, missing[],
savedTo, totalCostInCents }`. Install it with `add <slug> --kind font
--private`. The id goes to stderr as soon as a step starts; one font step runs
at a time (`code: "in_progress"`).

`logo "<name>" --brief <text>` (brief required) explores logo concepts:
`--tagline <text>`, `--colors "#hex,#hex"`, `-n 1..8` (default 4, also what
the preflight quotes), `-m`, `-o <dir>` (default `./generations/logos/<id>`),
`--no-download`, `--dry-run`, `--max-credits`, `--no-preflight`, `--json`.
Payload: `{ id, concepts[] { index, direction, url }, contactSheetUrl, savedTo[] | null, totalCostInCents }`;
files are `concept-<index>.<ext>`, then `contact-sheet.<ext>` (all concepts
numbered). URLs open in a browser. Logos stay private and never reach a registry.

`logo finalize <id> --concept <index>` builds the brand pack for one concept:
`-o <dir>` (default `./public/brand`), `--no-download`, `--dry-run`,
`--max-credits`, `--no-preflight`, `--json`. It quotes `logo-finalize` on the
logo's model, then waits for the run (a minute or two).
Payload: `{ id, concept, reused, pack { name, palette, files, head, license, disclaimer }, zip, savedTo[] | null, head, totalCostInCents }`.
A concept already finalized is downloaded again with `reused: true` and no
charge; one still being finalized is waited on, also uncharged. Rerunning after
a failed finalize tries again.
`totalCostInCents` is always what building the pack cost. `head` is the
`<head>` tags for where the pack was saved, `null` outside a `public/` folder.

Budget: `sufficient: false` → exit 2 `insufficient_credits`; estimate above
the cap → exit 1 (plain error, no `code`). Every real spend is appended to
`~/.artifisio/spend.log` (JSONL).

## Auth

### `auth [api-key]`
No argument: browser sign-in (OAuth + PKCE, loopback callback; progress on
stderr) → `{ source: "oauth", plan, creditsRemaining }`. With a key
(`--stdin`, `--json`): keys start with `artf_`, are minted at
<https://artifisio.com/profile>, and are stored in
`~/.artifisio/config.json` (0600) → `{ source: "file" }`.

### `logout`
`--json`. Revokes the browser sign-in and forgets any stored key → `{}`.

### `whoami`
`--verify`, `--json`. `{ apiKey: "<masked>" | null, source: env | file | oauth }`;
with `--verify`: `+ { verified: true, plan: sparkle | willow | supernova, creditsRemaining, autoRecharge { enabled, amountCredits }, capabilities { canGenerate, canSavePrivateStyle, canAccessPrivateSets } }`.

## Files

### `.artifisiorc.json` (project root, commit it)
```json
{
  "outputDir": "./public/illustrations",
  "brand": { "colors": ["#6366F1"] },
  "defaults": { "maxCreditsPerCall": 30, "preflight": true },
  "sets": {
    "open-doodles": { "source": "registry", "formats": ["svg"], "colors": { "primary": "#6366F1" }, "version": "2026.08.22-1315-f48e6a1", "manifestHash": "…", "name": "Open Doodles", "license": { "spdx": "CC-BY-4.0", "attributionRequired": true, "attribution": "…" } },
    "ui-essentials": { "source": "registry", "kind": "icon", "colors": { "ink": "#4A7CFF" }, "version": "…", "manifestHash": "…" },
    "multi-sans": { "source": "registry", "kind": "font", "formats": ["woff2"], "version": "…", "manifestHash": "…" }
  }
}
```
`kind` is written for icon and font sets; its absence means illustration.
`version`, `manifestHash`, `name`, `license` are CLI-managed.

### `ATTRIBUTION.md` (project root, commit it)
Regenerated on add / update / remove; lists every installed set that requires
credit — CC BY 4.0 illustration and icon sets, OFL 1.1 fonts.

### `~/.artifisio/`
`config.json` (key, optional `apiBaseUrl`), `cache/` (manifests, used by `--offline`), `spend.log`.

## Offline

`--offline` reads manifests from `~/.artifisio/cache` and fails every other
network call with `code: "offline_network_required"`. Offline-capable:
`search`, `styles`, `show`, `facets`, `ls`, `doctor`, `remove`,
`add --dry-run`, `add --cdn`, `models` (bundled catalog). No cached manifest →
`code: "offline_no_cache"`.

## Environment

`ARTIFISIO_API_KEY` (beats the stored key and the browser sign-in), `ARTIFISIO_API_BASE` (API base
URL, default `https://artifisio.com/api/dev`).
