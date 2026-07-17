# Available CLI Tools

- **rg** — ripgrep (`rg --line-number --color=never <pattern> [path]`). Use it via bash instead of grep. Supports `-i` (case-insensitive), `-F` (literal), `--glob`, `--type`, `-C N` (context), `-U` (multiline). Installed at `~/.pi/agent/bin/rg`.

## Secrets and environment

- **LLM provider keys** — stored in `auth.json` (managed by pi).
- **Extension API keys** — stored in `~/.pi/agent/.env` (see `.env.example`). Extensions read these via `extensions/shared/read-env.ts`.
