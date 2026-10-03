---
description: Add illustrations, icons or fonts to this project with Artifisio (find → preview → install, or generate an illustration style or icon set when nothing fits)
argument-hint: [brief, e.g. "friendly empty states and a UI icon set for a fintech app, brand #6366F1"]
---

Satisfy this brief with Artifisio, following the `artifisio` skill end to end:

> $ARGUMENTS

If the brief is empty, infer it from the project: read the README / landing
page / design tokens for the product's tone and brand colour, then pick
illustrations (and, if the brief calls for them, an icon set or a font) that
match.

Rules of engagement:
1. `npx artifisio init --json` first if there is no `.artifisiorc.json` (pass
   `--brand-color` when you know the brand hex).
2. Search with `--save-previews ./.artifisio-cache --json`, open the preview
   files and choose on what they look like, not on names. Narrow with
   `--kind illustration|icon|font` when you know which one you need.
3. Install with `--auto-color "<brand hex>"` — and pass `--kind icon` /
   `--kind font` explicitly for those kinds. Wire the assets into the existing
   pages the way this codebase already handles static assets, and keep
   `.artifisiorc.json` + `ATTRIBUTION.md`.
4. Only fall back to generation when nothing fits: `generate` for
   illustrations, `generate icons` for an icon set, `generate font` for a
   typeface (candidates first, then `--finalize` the one the user picks).
   Quote first, always `--max-credits`, and tell the user what it cost.
5. Finish with a short summary: what was installed, where, the attribution
   obligation, and what you left for the user to decide.
