# ~/.config

## Tracked configs

| Path | What it is |
|------|------------|
| `ghostty/` | Ghostty terminal config & GLSL shaders |
| `tmux/` | tmux config & plugins |
| `zed/` | Zed editor settings & themes |
| `nvim/` | Neovim config  |
| `zsh/` | Zsh config (.zshrc, .zshenv, .zprofile, functions) |
| `lvim` | LunarVim config (legacy) |
| `opencode/` | OpenCode AI editor config & skills |
| `ripgrep/` | ripgrep config |
| `bunfig.toml` | Bun package manager config |
| `macos-defaults.sh` | macOS system defaults script |
| `.gitignore` | Git ignore rules |


## Bootstrap

```bash
git clone --recurse-submodules git@github.com:tkuhemiya/.config.git ~/.config
ln -s ~/.config/pi ~/.pi
```
