---
name: capture-output
description: Record or capture CLI, TUI, code, web and share them to Discord. Use when the user wants to record/ capture output for Discord
---

only use ffmpeg if the file is larger than 25mb

# Available CLI's/ Tool's
- https://github.com/charmbracelet/freeze: file content and cli output to images
- https://github.com/charmbracelet/vhs: gif and video of a shell commands and TUI's (mainly demoing)
- https://github.com/vercel-labs/agent-browser/tree/main: web screenshots and recordings

## Freeze `freeze -h`
- install librsvg if not already, freeze uses this to create png's faster
- run `freeze -c ~/.pi/dotfiles/freeze.json /path-to-file -o /tmp/pi-capture/out.png` for file capture
- run `freeze -c ~/.pi/dotfiles/freeze.json --execute "cmd" -o /tmp/pi-capture/out.png` for terminal capture
- for markdown output use https://github.com/charmbracelet/glow, run `freeze -c ~/.pi/dotfiles/freeze.json --execute "glow /path-to-file" -o /tmp/pi-capture/out.png` for terminal capture.

## VHS `vhs -h` tape reference: `vhs manual`
- VHS requires ttyd and ffmpeg to be installed and available on PATH.
- run `vhs cassette.tape` to generate a gif
- try to use the same style as ~/.pi/dotfiles/freeze.json use `vhs manual` to see options

## Agent-Browser
- docs https://github.com/vercel-labs/agent-browser/tree/main
- https://agent-browser.dev/recording
