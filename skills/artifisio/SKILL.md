---
name: artifisio
description: >-
  Find, theme and install open-licensed illustrations, icons and fonts in a
  codebase with Artifisio — and generate a custom illustration style when
  nothing in the registry fits — via the `artifisio` CLI (`npx artifisio`) or
  the `artifisio` MCP tools. Use this skill WHENEVER a task needs artwork or
  visual assets: illustrations, SVGs, empty-state / onboarding / hero / spot
  graphics, an icon set or individual UI icons (arrows, chevrons, settings,
  search…), themed brand visuals, or a display/body typeface in an app or
  website — even if the user never says "Artifisio". Also for installing or
  updating illustration, icon and font sets, recolouring SVGs to a brand
  palette, or checking licensing and attribution. Start here before
  hand-writing SVGs, copying icon markup out of another library, fetching
  stock art, or calling a generic image API.
license: MIT
metadata:
  homepage: https://artifisio.com
  source: https://github.com/artifisio/skill
---

# Artifisio

Artifisio is a registry of **illustration sets** (SVG/raster artwork with a
themeable colour palette), **icon sets** (flat SVG icons on a fixed design
grid, also themeable) and **font sets** (OFL typefaces with a ready
`@font-face` stylesheet), plus a paid generator for when the registry has
nothing that fits. Free assets need no account, no key and no network beyond a
download. Everything ends up as plain files in the project — no runtime
dependency, no framework lock-in.

Two ways to drive it; pick the one your environment has:

| You have | Use | Notes |
|---|---|---|
| A shell | `npx artifisio <command> --json` | Canonical — every command lives here. Always pass `--json` when acting programmatically and parse the envelope. |
| `artifisio` MCP tools | the tools | Previews come back inline as images. Hosted MCP (`artifisio.com/api/mcp`) never writes files — it returns the `npx artifisio add …` command for you to run. |

The MCP server exposes exactly six tools — `search`, `show`, `facets`, `add`,
`quote`, `generate` — which behave like the CLI commands of the same name.
Everything else below (`init`, `styles`, `ls`, `update`, `remove`, `doctor`,
`models`, `auth`, `whoami`) is **CLI-only**; run it with `npx artifisio` even
in an MCP host. Details: `references/mcp.md`.

## Kinds

| Kind | `--kind` | Installs to | You get |
|---|---|---|---|
| Illustrations | `illustration` (default) | `./public/illustrations/<slug>/` | SVG + raster variants, typed index, themeable palette |
| Icons | `icon` | `./public/icons/<slug>/` | one flat `<icon>.svg` per icon (always SVG), typed index, themeable palette |
| Fonts | `font` | `./public/fonts/<slug>/` | font files + `<slug>.css` (`@font-face`), typed index, no palette |

Discovery commands (`search`, `styles`, `facets`) take
`--kind illustration|icon|font|all` and default to `all`. `add` and `show`
resolve a single slug, so they take one kind and no `all`; **pass `--kind`
explicitly** when you know it — without it they probe the registries in order
(illustration → icon → font) and the first hit wins, which is slower and
ambiguous if a slug exists in two registries.

The install paths above assume the default `outputDir`; all three follow
`.artifisiorc.json#outputDir` (icons and fonts as siblings of it), and `--dir`
overrides per set.

## The playbook

Most tasks are one of these two flows. Decide by whether an existing set fits —
and look at the artwork before deciding, never pick from names alone.

### Flow A — install an existing set (free, no key, no spend)

```bash
# 0. Once per project (optional but recommended): config + agent glue
npx artifisio init --brand-color "#6366F1" --json

# 1. Discover — save previews to disk so you can actually LOOK at them
npx artifisio search "<vibe, e.g. friendly people working>" \
  --save-previews ./.artifisio-cache --json
#    narrow by kind: --kind icon | --kind font | --kind illustration
#    brand proximity: --color "#6366F1"  (adds paletteDistance, re-ranks)

# 2. Inspect the candidate: palette, themeable slots, every item in the set
npx artifisio show <slug> --kind icon --save-previews ./.artifisio-cache --json

# 3. Install + theme in one step
npx artifisio add <slug> --auto-color "#6366F1" --json          # illustrations
npx artifisio add <slug> --kind icon --auto-color "#6366F1" --json
npx artifisio add <slug> --kind font --json                     # fonts: no colours
```

- `--save-previews <dir>` writes one representative preview per set to
  `<dir>/<slug>.<ext>` and adds `previewLocal` (absolute path) to each JSON
  row. **Open those files with your image/vision tool before choosing.**
  Installing the wrong vibe because you picked by name is the #1 failure mode.
- `search` is ranked (`score`, `matchedOn`); zero-score rows are dropped. If it
  returns nothing useful, broaden the query, or run `facets --json` to learn
  the real vocabulary (tags, themeable slots, icon grids/strokes, font
  scripts/weights). In a shell you can also filter with
  `styles --kind icon --tag ui,outline --themeable --json`; there is no MCP
  equivalent, so from an MCP host use `search` with `tag` instead.
- `add` is idempotent: the JSON carries `status: installed | updated | unchanged`.
  Branch on it instead of re-running blindly.
- Want to see the colours before committing? `add <slug> --auto-color "#hex"
  --preview-colors ./.artifisio-cache` renders the recoloured cover and stops
  (no download, no config). **Illustration sets only** — it errors on icon and
  font sets.

### Flow B — generate a style (costs credits, needs an API key)

Only when Flow A found nothing close. Generation spends the user's money —
read "Spending discipline" first.

**Generation produces illustrations only.** There is no icon or font
generation: if the icon or font registries have nothing that fits, say so and
fall back to the project's existing assets rather than trying to generate a
set.

```bash
# quote, then run with a cap; the returned savedAs.slug is a private style
npx artifisio generate style -p "fintech onboarding, flat 2D pastels" \
  --save-as fintech-v1 --max-credits 30 --json
# parse savedAs.slug (a <name>-<hash>; never guess it), then:
npx artifisio add <savedAs.slug> --private --json
npx artifisio generate illustration <savedAs.slug> -p "empty cart" --max-credits 5 --json
```

`--then-add` and `--then-generate "<subject>"` chain the three steps in one
call. Generated files land in `./generations/<timestamp>` (`-o <dir>` to
change); installed private sets go to the same output dir as public ones.

## Spending discipline (before any `generate`)

1 credit = US $0.01. Treat every `generate*` call as a purchase.

1. **Check the key and plan first** — let the CLI say what the account can do:
   `npx artifisio whoami --verify --json` → branch on `capabilities.canGenerate`
   and `creditsRemaining`. If `canGenerate` is false (free plan, zero balance,
   no key) stop and tell the user; do not retry.
2. **Preflight is on by default**: every `generate*` call is quoted against the
   server and aborted before the model runs if the estimate exceeds the cap or
   the balance. You still **cap every call** with `--max-credits <n>` (a few
   credits for one illustration, ~20–30 for a style sheet). The project-wide
   `defaults.maxCreditsPerCall` in `.artifisiorc.json` is the fallback cap.
3. **Quote without spending** when unsure: add `--dry-run --json` → 
   `{ estimatedCreditsMin, estimatedCreditsMax, creditsRemaining, sufficient }`.
   `sufficient: false` means stop.
4. Never use `--no-preflight` to get past an "insufficient balance" or
   "over budget" abort. Every spend is appended to `~/.artifisio/spend.log`.

## Theming

Illustration **and icon** palettes have named **themeable slots** (illustrations
tend to use `primary`/`secondary`/…; icons use `ink` plus `accent-*`). Fonts
have none. On `add`:

- `--auto-color "#hex[,#hex2,…]"` — each hex takes the closest still-unused
  themeable slot. The right default when you only know brand colours. The JSON
  reports what happened in `autoColors[] { slot, hex, appliedHex, distance }`.
- `--colors "slot=#hex,other=#hex"` — explicit slots, once `show` told you the
  names. Mutually exclusive with `--auto-color`.
- A brand colour saved by `init --brand-color` (`.artifisiorc.json#brand.colors`)
  is applied automatically when neither flag is given.

Default injects CSS variables (`--artf-<slot>`) on the SVG root so the artwork
re-themes at runtime (set them on any ancestor); `--bake` hard-codes the hex
into fills instead, for consumers that cannot process CSS custom properties.

Mono icon sets paint with `fill="var(--artf-ink, currentColor)"`, so an
untouched icon simply inherits the surrounding text colour — often you need no
colour flags at all. Duotone sets carry a measured hex fallback per slot.

For illustrations, colours apply to `svg`/`pdf` only; raster variants are
pre-rendered and unaffected. Icons are always SVG, so the caveat does not apply
to them. `--auto-color` / `--colors` are ignored for fonts.

## What `add` leaves behind (and what to do with it)

- **Files** under the set's output directory (see *Kinds* above):
  - illustrations — one file per illustration × requested format;
  - icons — one flat `<icon>.svg` per icon, plus `sprite.svg` when the set
    ships one (most do not);
  - fonts — `<slug>-<style>.<fmt>` files plus `<slug>.css` containing the
    `@font-face` rules; link or import that stylesheet and use
    `font-family: "<family>"`.
- **`index.ts`** (or `.d.ts`) next to the files when `tsconfig.json` exists, so
  imports are typed. `--emit none|ts|dts` overrides. Exports per kind:
  - illustrations — `IllustrationSlug`, `paths`, `IllustrationPaths`,
    `palette`, `PaletteSlotName`;
  - icons — `IconName`, `icons`, `IconPaths`, `palette`, `PaletteSlotName`,
    and `sprite` only when the set ships one;
  - fonts — `fontFamily`, `fontCss`, `fontFiles`.
- **`.artifisiorc.json`** at the project root — commit it. It pins each set's
  version and manifest hash so installs reproduce; don't hand-edit the
  CLI-managed `version` / `manifestHash`.
- **`ATTRIBUTION.md`** at the project root, regenerated on every add / update /
  remove for sets whose licence requires credit (CC BY 4.0 illustrations **and
  icons**, OFL 1.1 fonts). Commit it and, for public-facing products, surface
  the credit somewhere visible (footer, about page, README). Rows from
  `search` / `show` / `add` carry `license`, `attributionRequired`,
  `attribution`.

Wire the assets in with the project's normal conventions (`<img src>`, an
inline SVG import, a CSS `url()`, the generated index) — Artifisio ships no
components on purpose.

## Reading results and errors

Every `--json` response is an envelope: `{ "apiVersion": 1, "ok": true, … }` or
`{ "apiVersion": 1, "ok": false, "error": "…", "code": "…" }`. Check `ok`
first; surface `error` verbatim — messages include concrete next steps. A
bumped `apiVersion` means a breaking shape change.

- CLI `code`s: `insufficient_credits` (exit 2), `offline_no_cache`,
  `offline_network_required`. Most other failures carry no `code` — read
  `error`.
- MCP error `code`s: `insufficient_credits`, `over_budget`, `no_api_key`,
  `not_found`, `network`, plus the two offline codes forwarded from the CLI
  core.

Network down? `--offline` serves the cached registry manifests; `search`
falls back from the hosted API to local ranking automatically (`source:
"api" | "local"` in the payload).

## Keeping sets healthy

All four commands work across every kind and are CLI-only.

- `npx artifisio ls --json` — installed sets and pins (`kind` per row).
- `npx artifisio update <set…> --json` — re-download at latest (`--dry-run`,
  `--keep-orphans`). One JSON line per slug: either
  `{ slug, upToDate: true, … }` or
  `{ ok, slug, dryRun, added, changed, removed, skipped, errors, missingVariants, attributionFile }`.
- `npx artifisio doctor --json` — verify files against pinned hashes, warn on
  stale pins; exit 1 on drift (CI-friendly). `--network` also probes the
  registries.
- `npx artifisio remove <set…> --json` — delete files + config entry
  (`--keep-files` to drop only the entry); `ATTRIBUTION.md` is regenerated.

## Auth (private sets and generation only)

`npx artifisio auth <key>` stores the key in `~/.artifisio/config.json` (or
`--stdin` for CI); the `ARTIFISIO_API_KEY` env var takes precedence. The MCP
server reads the same places, so one `auth` covers both. Keys are minted at
artifisio.com → your profile (https://artifisio.com/profile). `--private` on
`add` / `styles` targets the key owner's private sets — always illustration
styles.

## Reference

- `references/cli.md` — every command, flag, format token and JSON field.
- `references/mcp.md` — the MCP tools, their inputs and outputs, resources.
