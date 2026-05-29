# Tmux Package Management

Tmux packages are brought in directly — no package manager (no TPM).

- **Config**: `tmux.conf`
- **Plugins**: standalone files in the `plugins/` directory, sourced from `tmux.conf`

To add/update a plugin: ask the agent to download the source and wire it in.
