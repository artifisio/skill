import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PreparedImage, PreviewImage } from '../types'

const PANE = 'artifisio-view'
const TITLE = 'Artifisio'
const GENERATE = /^mcp__.*artifisio.*__generate$/i
const images = atom({ plugin: 'artifisio', key: 'images' } as const, [])
const index = atom({ plugin: 'artifisio', key: 'index' } as const, 0)
const prepared = atom({ plugin: 'artifisio', key: 'prepared' } as const, {})

type Result = Record<string, any>

/** The images of one `generate` result, labelled, with the local file the stdio server saved when it lines up. */
export function imagesOf(r: Result): PreviewImage[] {
  const found: Omit<PreviewImage, 'file'>[] = []
  for (const c of r.concepts ?? []) found.push({ url: c.url, label: `Concept ${c.index}: ${c.direction}${c.misspelledAs ? ` (reads "${c.misspelledAs}")` : ''}` })
  if (r.contactSheetUrl) found.push({ url: r.contactSheetUrl, label: 'Contact sheet' })
  for (const c of r.candidates ?? []) found.push({ url: c.url, label: `Candidate ${c.index}${c.index === r.recommended ? ' (recommended)' : ''}` })
  if (r.specimenUrl) found.push({ url: r.specimenUrl, label: `Specimen: ${r.family ?? r.name}` })
  if (r.sheetUrl) found.push({ url: r.sheetUrl, label: `Icon sheet: ${r.name}` })
  if (r.pack?.files?.['og.png']?.url) found.push({ url: r.pack.files['og.png'].url, label: `Brand pack preview, concept ${r.concept}` })
  r.images?.forEach((url: string, i: number) => found.push({ url, label: `Image ${i + 1}` }))
  const saved: unknown[] = Array.isArray(r.savedTo) && r.savedTo.length === found.length ? r.savedTo : []
  return found.map((image, i) => {
    const file = saved[i]
    return typeof file === 'string' && file.endsWith('.png') ? { ...image, file } : image
  })
}

/** A PNG's width and height, read from its header. */
async function pngSize($: EngineInterface, file: string) {
  const { exitCode, stdout } = await $.process.run(['od', '-An', '-tx1', '-N24', file])
  const bytes = stdout.trim().split(/\s+/).map((b) => parseInt(b, 16))
  if (exitCode !== 0 || bytes.slice(1, 4).map((b) => String.fromCharCode(b)).join('') !== 'PNG') return null
  const u32 = (at: number) => ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0
  return { width: u32(16), height: u32(20) }
}

/** Puts the image in a file the terminal reads itself: boards are over the 2 MiB inline limit. */
async function prepare($: EngineInterface, image: PreviewImage | undefined) {
  if (!image || (await read($, prepared))[image.url]) return
  let entry: PreparedImage
  try {
    let file = image.file && (await $.fs.exists(image.file)) ? image.file : undefined
    if (!file) {
      file = `${((await $.env.get('TMPDIR')) ?? '/tmp').replace(/\/$/, '')}/artifisio-preview/${image.url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_')}`
      const { exitCode, stderr } = await $.process.run(['curl', '-sSfL', '--create-dirs', '--max-time', '60', '-o', file, image.url], { timeoutMs: 70_000 })
      if (exitCode !== 0) throw new Error(stderr.trim() || `curl exited ${exitCode}`)
    }
    const size = await pngSize($, file)
    entry = size ? { file, ...size } : { error: 'not a PNG' }
  } catch (err) {
    entry = { error: err instanceof Error ? err.message : String(err) }
  }
  await update($, prepared, (all) => ({ ...all, [image.url]: entry }))
}

/** This session's images, or the last ones shown before a restart. */
async function latest($: EngineInterface) {
  const held = await read($, images)
  return held.length ? held : (((await $.store.get('images')) ?? []) as PreviewImage[])
}

/** `focus` hands the pane the keys, so the arrows move between its buttons instead of leaving the session. */
async function show($: EngineInterface, list: PreviewImage[], at: number, focus: boolean) {
  await update($, images, () => list)
  await $.store.set('images', list)
  const i = Math.max(0, Math.min(at, list.length - 1))
  await update($, index, () => i)
  const opened = await $.ui.open({ id: PANE, title: TITLE, rows: 24, ...(focus ? ({ focus: true, closeOnEscape: true } as const) : {}) })
  await prepare($, list[i])
  return opened
}

async function step($: EngineInterface, by: number) {
  const list = await read($, images)
  const i = (((await read($, index)) + by) % list.length + list.length) % list.length
  await update($, index, () => i)
  await prepare($, list[i])
}

/** Columns and rows for a picture in a box, taking a cell as twice as tall as it is wide. */
function fit(width: number, height: number, columns: number, rows: number) {
  const across = Math.max(1, Math.min(255, columns, Math.floor((rows * 2 * width) / height)))
  return { columns: across, rows: Math.max(1, Math.min(255, Math.round((across * height) / width / 2))) }
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'artifisio-view', description: 'Show the latest Artifisio images in a pane', immediate: true })
    await $.tool.register({
      name: 'preview',
      description:
        "Show images to the user in Claude Code's Artifisio pane: the user does not see the images a tool result carries, only their URLs. The pane opens on its own after each Artifisio `generate` when the terminal has room; call this to show a chosen subset (a shortlist, the versions of one concept), earlier URLs, or to reopen the latest result. PNG only.",
      inputSchema: {
        type: 'object',
        properties: {
          images: {
            type: 'array',
            description: 'The images to show, in order; leave out to show the latest generate result.',
            items: {
              type: 'object',
              properties: { url: { type: 'string' }, label: { type: 'string', description: 'What the image is, e.g. "Concept 2: FS monogram"' } },
              required: ['url'],
            },
          },
          index: { type: 'number', description: 'Which image to show first, from 0.' },
        },
      },
      isDeferred: false,
    })
    return next(e)
  })

  on('command.run', { command: 'artifisio-view' }, async ($) => {
    const list = await latest($)
    const count = list.length
    if (!count) return { text: 'No Artifisio images yet in this session: they appear here after a `generate`.' }
    await show($, list, await read($, index), true)
    return { text: `Showing ${count} Artifisio image${count === 1 ? '' : 's'}.` }
  })

  on('tool.call', { tool: 'mcp__artifisio__preview' }, async ($, e) => {
    const input = e as { images?: { url: string; label?: string }[]; index?: number }
    const list = input.images?.map((image, i) => ({ url: image.url, label: image.label ?? `Image ${i + 1}` }))
    const shown = list?.length ? list : await latest($)
    if (!shown.length) return { result: 'No Artifisio images in this session yet: pass `images`.' }
    const opened = await show($, shown, input.index ?? 0, true)
    return {
      result: opened.isPlaced
        ? `The user now sees the pane, on image ${(await read($, index)) + 1} of ${(await read($, images)).length}.`
        : 'The pane is open but not drawn: the terminal is too narrow for a pane the user did not open. Tell the user to run /artifisio-view.',
    }
  })

  on('tool.call', { tool: GENERATE }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError || !ran.text) return ran
    const found = imagesOf(JSON.parse(ran.text))
    if (!found.length) return ran
    const opened = await show($, found, 0, false)
    if (!opened.isPlaced) $.ui.toast(`Artifisio: ${found.length} image${found.length === 1 ? '' : 's'} ready · /artifisio-view`)
    return ran
    // A failure here hands back the call's result as it ran: a generation is charged, so it never runs twice.
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, images)
    const i = Math.min(await read($, index), list.length - 1)
    const image = list[i]
    if (e.surface !== 'terminal') {
      const { Box, Link, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          {!image && <Text dimColor>No Artifisio images yet.</Text>}
          {list.map((one, at) => (
            <Box key={`link-${at}`}>
              <Link href={one.url} label={one.label} />
            </Box>
          ))}
        </Box>
      )
    }
    const { Box, Button, Image, Link, Text } = $.ui.resolve(e)
    if (!image) return <Text dimColor>No Artifisio images yet.</Text>
    const ready = (await read($, prepared))[image.url]
    const alt = `${image.label}: ${image.url}`
    const box = ready && 'file' in ready ? fit(ready.width, ready.height, e.props.bodyColumns, e.props.scroll.bodyRows - 3) : null
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold wrap="truncate-end">
            {i + 1}/{list.length} {image.label}
          </Text>
          {list.length > 1 && (
            <Box flexDirection="row" gap={1}>
              <Button key="previous" label="◀ p" hotkey="p" onPress={() => step($, -1)} />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- a terminal pane's focus ring, not the DOM */}
              <Button key="next" label="n ▶" hotkey="n" autoFocus onPress={() => step($, 1)} />
            </Box>
          )}
        </Box>
        {!ready && <Text dimColor>Loading {image.label}…</Text>}
        {ready && 'error' in ready && <Text dimColor>Cannot show it here ({ready.error}).</Text>}
        {ready && 'file' in ready && box && <Image key="image" source={{ file: ready.file, format: 'png' }} columns={box.columns} rows={box.rows} alt={alt} />}
        <Link href={image.url} label="Open full size" />
        {list.length > 1 && <Text dimColor>{e.props.isFocused ? 'p / n · Esc closes' : 'ctrl+x tab to browse'}</Text>}
      </Box>
    )
  })
}
