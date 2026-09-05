# ~/.config

XDG configs for this machine. Clone this repo to `~/.config`.

| Path | What it is |
|------|------------|
| `nvim/` | Neovim |
| `zsh/` | Zsh (`ZDOTDIR`) |
| `ghostty/` | Ghostty |
| `tmux/` | tmux |
| `zed/` | Zed |
| `herdr/` | Herdr (`config.toml` only) |
| `opencode/` | OpenCode |
| `ripgrep/` | ripgrep |
| `bunfig.toml` | Bun |
| `pi/` | Pi agent (symlink to `~/.pi`) |
| `.agents/` | Agent skills |
| `scripts/` | macOS bootstrap |

## Bootstrap

```bash
git clone --recurse-submodules git@github.com:tkuhemiya/.config.git ~/.config
ln -s ~/.config/pi ~/.pi
cp ~/.pi/agent/.env.example ~/.pi/agent/.env
```

Fill in `~/.pi/agent/.env`. Zsh loads it, so OpenCode can use `{env:CONTEXT7_API_KEY}`.

Then:

```bash
~/.config/scripts/setup-mac.sh
~/.config/scripts/macos-defaults.sh
```
