---
name: capture-output
description: Record or capture demos (CLI, TUI, code, web) and share them to Discord. Use when the user wants to record, capture, screenshot, or demo something for Discord — keywords like record, capture, demo, video, screenshot. Do not use for uploading files that already exist; use upload_to_discord directly instead.
---

# Capture Output

Record demos with CLI capture tools, then post to Discord via `upload_to_discord`.

This skill handles **capture and compression only**. Transport is always `upload_to_discord` (the pi extension).

## When to use

| User intent | Action |
|-------------|--------|
| "record a demo and post to Discord" | Full pipeline: capture → compress → `upload_to_discord` |
| "capture the CLI workflow" | Capture only; upload if asked |
| "upload ./foo.png to Discord" | **Do not use this skill** — call `upload_to_discord` directly |

## Tool selection

| Surface | Tool | Use when |
|---------|------|----------|
| Static code or terminal frame | **freeze** | One image, no animation |
| Scripted shell demo | **vhs** | Commands can be written in a `.tape` file ahead of time |
| Live interactive TUI | **terminal-control** (`termctrl`) | Driving a live UI with waits, markers, spinners |
| Web app | **agent-browser** | Browser screenshots or screen recording |

**Rule of thumb:** if you can write a `.tape` before running → VHS. If the demo requires driving a live TUI → terminal-control.

## Artifact directory

Use one directory per capture run:

```
/tmp/pi-capture-{YYYYMMDD-HHMMSS}/
```

Generate the id once at the start and reuse it for all artifacts in that demo (source files, exports, compressed copies). **Never auto-delete** capture directories — leave cleanup to the user.

## End-to-end workflow

1. Create `/tmp/pi-capture-{id}/`
2. Capture with the appropriate tool (section below)
3. Export final upload-ready `.png`, `.mp4`, or `.webm`
4. If total file size exceeds 25 MiB, compress (see Compression)
5. Call `upload_to_discord` with `filePaths` and an optional `message` caption

Post autonomously — no user confirmation required.

## Security

- **Never upload raw `.termctrl` recordings** — they can contain prompts, tokens, and secrets. Only upload exported `.mp4` or `.png`.
- Scrub or avoid recording sensitive output (API keys, `.env` contents, passwords).
- Do not commit capture artifacts to git.

---

## freeze — static images

For code files and one-shot terminal output.

```bash
CAPTURE_DIR="/tmp/pi-capture-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CAPTURE_DIR"

# Code file
freeze path/to/file.go -o "$CAPTURE_DIR/code.png"

# Terminal command output
freeze --execute "ls -la" -o "$CAPTURE_DIR/output.png"
```

Upload: `upload_to_discord` with `filePaths: ["$CAPTURE_DIR/code.png"]`

---

## vhs — scripted CLI video

For reproducible shell demos written as `.tape` files.

```bash
CAPTURE_DIR="/tmp/pi-capture-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CAPTURE_DIR"

# Write demo.tape, then:
vhs "$CAPTURE_DIR/demo.tape"
# Default output: demo.mp4 or demo.gif in cwd — move to CAPTURE_DIR
mv demo.mp4 "$CAPTURE_DIR/demo.mp4"
```

Example `.tape` sketch:

```
Output $CAPTURE_DIR/demo.mp4
Set FontSize 20
Set Width 1200
Set Height 600
Type "echo hello"
Enter
Sleep 2s
```

Upload: `upload_to_discord` with `filePaths: ["$CAPTURE_DIR/demo.mp4"]`

---

## terminal-control — live TUI video

For interactive TUI sessions (pi, opencode, spinners, real-time state).

```bash
CAPTURE_DIR="/tmp/pi-capture-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CAPTURE_DIR"

termctrl start demo --record "$CAPTURE_DIR/demo.termctrl" --host opentui -- <app-command>
termctrl mark demo ready
termctrl send demo --pace-ms 35 'text:Hello' enter
termctrl wait demo "expected output" --timeout 60000
termctrl mark demo done
termctrl stop demo

# Export video (optionally with edit plan for polished cuts)
termctrl video "$CAPTURE_DIR/demo.termctrl" --footer --tail-ms 0 --hide-cursor --out "$CAPTURE_DIR/demo.mp4"
```

For a static frame from a marker:

```bash
termctrl save demo --format png --out "$CAPTURE_DIR/frame.png"
```

Upload **only** `$CAPTURE_DIR/demo.mp4` or `.png` — never the `.termctrl` file.

---

## agent-browser — web screenshots and video

For web app demos. Output is WebM for video.

```bash
CAPTURE_DIR="/tmp/pi-capture-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CAPTURE_DIR"

# Screenshot
agent-browser open https://example.com
agent-browser wait --load networkidle
agent-browser screenshot "$CAPTURE_DIR/page.png"

# Video
agent-browser open https://example.com
agent-browser record start "$CAPTURE_DIR/demo.webm"
agent-browser wait 500
agent-browser snapshot -i
agent-browser click @e1
agent-browser wait 500
agent-browser record stop
agent-browser close
```

Add `agent-browser wait 500` between steps when recording for human-readable pacing.

Upload: `upload_to_discord` with the `.png` or `.webm` path.

---

## Compression

Discord limits each message to **25 MiB** total. If the export exceeds that, compress before uploading:

```bash
# Video — re-encode to smaller MP4
ffmpeg -i "$CAPTURE_DIR/demo.mp4" \
  -vf "scale='min(1280,iw)':-2" \
  -c:v libx264 -crf 28 -preset fast \
  -an \
  "$CAPTURE_DIR/demo-compressed.mp4"

# WebM from agent-browser
ffmpeg -i "$CAPTURE_DIR/demo.webm" \
  -vf "scale='min(1280,iw)':-2" \
  -c:v libx264 -crf 28 -preset fast \
  -an \
  "$CAPTURE_DIR/demo-compressed.mp4"
```

If still over 25 MiB after compression, call `upload_to_discord` with a text-only `message` explaining the failure and include the local file path. Do not split videos across messages.

---

## Upload

Call `upload_to_discord` when ready:

```
upload_to_discord({
  filePaths: ["/tmp/pi-capture-20260717-053000/demo-compressed.mp4"],
  message: "CLI demo: added auth middleware"
})
```

Text-only posts (e.g. capture failure):

```
upload_to_discord({
  message: "Demo skipped: vhs exited with code 1. Artifacts at /tmp/pi-capture-20260717-053000/"
})
```

`DISCORD_MENTION_USER_ID` in `~/.pi/agent/.env` auto-prepends an @mention on every post.
