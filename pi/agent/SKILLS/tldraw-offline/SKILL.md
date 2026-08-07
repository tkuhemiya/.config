---
name: tldraw-offline
description: Interact with the tldraw offline desktop app (offline.tldraw.com) via its Local Canvas API on localhost:7236. Use when user wants to read, edit, or create diagrams on their tldraw canvas.
---

# tldraw offline Skill

Work with the tldraw offline desktop app (offline.tldraw.com): read the open canvas, make edits, and write document scripts — JavaScript embedded in a `.tldraw` file that runs on load and gives the file durable behavior. The app runs a local HTTP API (default `localhost:7236`) that a coding agent drives with plain `curl` from its terminal — this is exactly how the app's own homepage demo (Codex editing a canvas live) works. The agent does NOT use computer-use / GUI clicking, and does NOT hand-edit the `.tldraw` file directly. Keep tldraw offline open while you work.

## When to Use

- The user has tldraw offline open and asks you to build or modify a canvas (diagrams, wireframes, layouts).
- You want to add durable behavior to a drawing (reactive shapes, interactive buttons, animation, connection logic) via an embedded document script.

Do NOT hand-place shapes to imitate a drawing — write the code that generates them. Agents are far better at scripting the canvas than at drawing on it.

## Prerequisites

- **tldraw offline installed and running**, with a document open. Releases: https://github.com/tldraw/tldraw-offline/releases/latest (macOS DMG, Windows x64/Arm64, Linux x86_64/arm64 AppImage or amd64/arm64 .deb).
- **Agent skills installed in the app**: Develop → Install Agent Skills. The app writes its own tldraw skill into `~/.codex/skills/`, `~/.claude/skills/`, `~/.cursor/skills/`, and `~/.gemini/skills/` — teaching that agent the curl recipes below.
- **The local control API.** On launch the app writes `server.json` to its config dir (macOS `~/Library/Application Support/tldraw/`, Linux `~/.config/tldraw/`, Windows `%APPDATA%\tldraw\`) with `port` (default 7236), a bearer `token`, `pid`, and `startedAt`. Every request except `GET /` needs `Authorization: Bearer <token>`. A clean quit removes `server.json`; if it's present but the port doesn't answer, the app quit uncleanly — treat as not running.

**Re-read port + token on EVERY shell call.** Each terminal call is a fresh shell, so an exported token does not persist — "export once and reuse" sends an empty token and 401s. Read both inline at the top of each call.

No account or network needed for local editing.

## Setup — Read config (do this at the top of every call)

```bash
# macOS
CONFIG_DIR="$HOME/Library/Application Support/tldraw"

# Linux
# CONFIG_DIR="$HOME/.config/tldraw"

# Windows
# CONFIG_DIR="$APPDATA/tldraw"

PORT=$(jq -r .port "$CONFIG_DIR/server.json")
TOKEN=$(jq -r .token "$CONFIG_DIR/server.json")
BASE="http://localhost:$PORT"
```

## How to Run

Two distinct workflows. Pick by whether the change must survive a reload.

### A. One-off canvas edits (`/exec`) — layout, generating shapes, cleanup

This is a live edit, not saved to the document script.

```bash
# Find the focused document ID
DOC=$(curl -s "$BASE/api/search" -X POST \
  -H "content-type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"return (await api.getFocusedDoc()).id"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['result'])")

# Run code with the live `editor` + `helpers` in scope
curl -s "$BASE/api/doc/$DOC/exec" -X POST \
  -H "content-type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"const {createShapeId,toRichText}=await import(\"tldraw\"); editor.createShape({id:createShapeId(),type:\"geo\",x:0,y:0,props:{geo:\"rectangle\",w:200,h:100,color:\"blue\",fill:\"solid\",richText:toRichText(\"hello\")}}); return editor.getCurrentPageShapes().length"}'
```

### B. Durable behavior (`script/main.js`) — reactive/interactive logic that must survive reload

Edit the file on disk; the app's watcher applies it:

```bash
# Get the live script file path for the doc
curl -s "$BASE/api/doc/$DOC/script-workspace" -X POST \
  -H "Authorization: Bearer $TOKEN"
# → result.mainJsPath, result.isDefaultScript

# Edit result.mainJsPath with read_file / patch / write_file
# (see scripts/main.js for the default)

# Then confirm the watcher applied it:
curl -s "$BASE/api/doc/$DOC/script-status" \
  -H "Authorization: Bearer $TOKEN"
```

## Reading the canvas

```bash
# List all shapes on the page
curl -s "$BASE/api/search" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"code":"return await api.getShapes('\''$DOC'\'')"}'

# Get bindings (arrows, connections)
curl -s "$BASE/api/search" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"code":"return await api.getBindings('\''$DOC'\'')"}'

# Get a screenshot (returns filePath)
curl -s "$BASE/api/search" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"code":"return api.getScreenshot('\''$DOC'\'')"}'
```

## Quick Reference — Document Script Contract

The document-script contract (verified against the app's bundled `script-context.d.ts`):

```typescript
import { createShapeId, toRichText } from 'tldraw'  // primitives: import, not global

export default function ({ editor, helpers, signal }) {
  editor.run(() => {
    // batch = one undo step
    helpers.createShapeIfMissing({
      // idempotent furniture
      id: createShapeId('node-1'),
      type: 'geo',
      x: 0,
      y: 0,
      props: {
        geo: 'rectangle',
        w: 200,
        h: 100,
        richText: toRichText('hi'),
      },
    })
  })

  const stop = editor.store.listen(() => { /* react */ })  // fires the tick AFTER a commit
  signal.addEventListener('abort', () => stop())  // REQUIRED cleanup on rerun/close
}
```

Key helpers available:

- `ctx.editor` — the live Editor (`createShape`, `updateShape`, `deleteShapes`, `getCurrentPageShapes`, `getShape`, `getBindingsFromShape`, `zoomToFit`, `on('tick'|'event', fn)`, `run(fn, { history: 'ignore' })`).
- `ctx.helpers` — `createShapeIfMissing`, `createShapesIfMissing`, `createArrowBetweenShapes(from, to, { arrowheadEnd })`, `translateShapes`, `onShapeTranslate(id, fn, { signal })`, `richTextToPlainText`, `boxShapes`, `getLints`.
- `ctx.signal` — `AbortSignal`; attach every listener/interval teardown to it.
- `config.js` (separate file) registers custom shape/tool/component utils and runs before mount; `main.js` runs against the mounted editor and reruns on save.

## Interactive UI (clickable buttons that drive state)

Drawn shapes can behave like a real app — the thing a static whiteboard can't do. The pattern:

```javascript
export default function ({ editor, helpers, signal }) {
  // 1. Build buttons idempotently; tag each with meta so the handler finds them.
  // Give buttons a visible label AND a meta.action.

  // 2. Hit-test pointer_down in PAGE coordinates, find the shape under the pointer:
  editor.on('event', (event) => {
    if (event.type === 'pointer' && event.name === 'pointer_down') {
      const point = event.xy  // page coords
      const hit = editor.getCurrentPageShapes().find((s) =>
        helpers.boxShapes(s).containsPoint(point)
      )
      if (!hit) return
      const action = hit.meta?.action
      if (action === 'increment') { /* ... */ }
    }
  })

  signal.addEventListener('abort', () => /* cleanup */)
}
```

## Shipping a self-running scripted `.tldraw`

A `.tldraw` file is a JSON-tar (a directory with `document.tldr` + `scripts/` inside, tarred and gzipped). You can ship a file that recreates itself on every open — useful for templates, tutorials, and demos.

**Procedure:** Generate the content → spawn a temp working dir → assemble the tar → `curl -X POST ... /api/import-tldraw-file`.

1. **Write the script** (e.g., `scripts/main.js`) using the document-script contract above.
2. **Write a script that generates the canvas content** — shapes, bindings, layout.
3. **Bundle into a `.tldraw` file** and import it.

```bash
# Step 1: Create a temp directory with the right structure
WORKDIR=$(mktemp -d)
mkdir -p "$WORKDIR/scripts"

# Step 2: Write scripts/main.js
cat > "$WORKDIR/scripts/main.js" << 'SCRIPT'
import { createShapeId, toRichText } from 'tldraw'

export default function ({ editor, helpers, signal }) {
  // Create initial shapes
  editor.run(() => {
    helpers.createShapesIfMissing([
      { id: createShapeId('title'), type: 'text', x: 200, y: 50,
        props: { richText: toRichText('My Automated Diagram'), font: 'sans', size: 'm' } },
      { id: createShapeId('box-1'), type: 'geo', x: 100, y: 150,
        props: { geo: 'rectangle', w: 180, h: 80, color: 'blue', fill: 'solid',
                 richText: toRichText('Step 1') } },
      { id: createShapeId('box-2'), type: 'geo', x: 400, y: 150,
        props: { geo: 'rectangle', w: 180, h: 80, color: 'green', fill: 'solid',
                 richText: toRichText('Step 2') } },
    ])
    helpers.createArrowBetweenShapes(
      editor.getShape(createShapeId('box-1')),
      editor.getShape(createShapeId('box-2')),
    )
  })
}
SCRIPT

# Step 3: Create a minimal document.tldr (empty canvas state)
echo '{"store":{"__schema__":1},"schema":{"sequence":1},"records":[]}' > "$WORKDIR/document.tldr"

# Step 4: Tar.gz it as a .tldraw file
OUTPUT="/tmp/my-diagram.tldraw"
(cd "$WORKDIR" && tar czf "$OUTPUT" .)

# Step 5: Import into tldraw offline
curl -s "$BASE/api/import-tldraw-file" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$OUTPUT"

# Cleanup
rm -rf "$WORKDIR"
```

## Shape Props (validated against tldraw SDK v5 schema)

| type    | key props                                        |
|---------|--------------------------------------------------|
| text    | `x`, `y`, `richText`, `font`, `size`, `color`    |
| note    | `x`, `y`, `richText`, `color`, `font`, `size`    |
| frame   | `x`, `y`, `w`, `h`, `name`, `color`              |
| geo     | `geo`, `w`, `h`, `color`, `fill`, `richText` (+ dash/size/etc. defaulted) |
| arrow   | (created via `helpers.createArrowBetweenShapes`)  |

- `richText` must be `toRichText('...')` — a bare string is rejected.
- `color` enum: `black`, `grey`, `light-violet`, `violet`, `blue`, `light-blue`, `yellow`, `orange`, `green`, `light-green`, `light-red`, `red`, `white`.
- `font` enum: `draw`, `sans`, `serif`, `mono`.

## Pitfalls

- **`store.listen` fires on the tick AFTER a commit**, not synchronously. If you write a shape and immediately read state expecting the listener to have run, it hasn't. Await a tick before verifying.
- **`ctx`, not globals.** The entry is `export default function ({ editor, helpers, signal })`. There is no bare `editor` global in a document script.
- **`createShapeId`/`toRichText`/`Vec`** come from `import ... from 'tldraw'`.
- **`richText`, not `text`.** Text/note/geo labels use `richText: toRichText(s)`.
- **Raw records need every prop; `createShape` does not.** In-app pass only the props you care about; a hand-built `.tldraw` snapshot needs the full set.
- **Scripts rerun on every load — be idempotent.** Use `createShapeIfMissing` with stable ids or you duplicate content and clobber user edits.
- **Clean up on `signal`.** `signal.addEventListener('abort', () => stop())` for every `store.listen` / `editor.on` / `setInterval`; the signal fires before rerun and on close.
- **Keep script writes out of undo:** `editor.run(fn, { history: 'ignore' })`.
- **`editor.on('tick')`** pauses when the window is hidden (it is a RAF loop); `setInterval` keeps firing but Electron throttles it to ~1/s in the background.
- **The API needs the bearer token from `server.json`**; the port can be non-default (`server.listen(0)` picks one) — always read the file, don't hardcode 7236.
- **Only `tldraw` / `react` / `react-dom` import** — not a Node project.

## Verification

- **Shape schema (offline, no app):** `node scripts/validate_shapes.mjs` — builds the real tldraw schema and validates note/text/frame.
- **Live canvas edits:** after `/exec`, read back with `api.getShapes(docId)` (returns `{ page, viewport, shapes }`) and `api.getBindings(docId)` (array). Confirm expected shapes/bindings exist. Grab `api.getScreenshot(docId)` (returns `{ filePath, ... }`) and inspect the PNG/JPEG.
- **Durable script applied:** `GET /api/doc/:id/script-status`. Success is `state: "applied"` (`currentDiskDigest === lastAppliedDigest === manifestSha256`, `pendingApply === false`, `lastApplyError === null`). If it stays `"pending"` after a short retry, report that instead of claiming success; `"error"` means the apply failed — read `errorLogPath`.

## Additional Resources

- [tldraw offline GitHub releases](https://github.com/tldraw/tldraw-offline/releases/latest)
- [tldraw offline user manual](https://app.notion.com/p/tldraw/User-manual-39a3e4c324c080e7b2eacc5afd078e85)
