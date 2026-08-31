#!/usr/bin/env bash
set -euo pipefail

# Simple, readable installer for Neovim LSP servers, formatters, and Treesitter parsers.
# Supported OS: macOS (Homebrew) and Ubuntu / Debian (apt).

echo "=== Detecting OS ==="
OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
    echo "Running on macOS"
    if ! command -v brew &>/dev/null; then
        echo "Error: Homebrew is required on macOS." >&2
        exit 1
    fi

    echo "Installing system tools and packages via brew..."
    brew install ripgrep fd tree-sitter lua-language-server stylua

elif [ "$OS" = "Linux" ]; then
    echo "Running on Linux"
    if command -v apt-get &>/dev/null; then
        echo "Installing system tools via apt..."
        sudo apt-get update
        sudo apt-get install -y ripgrep fd-find build-essential curl git
    fi

    # Install stylua if cargo exists, or warn
    if command -v cargo &>/dev/null; then
        echo "Installing stylua via cargo..."
        cargo install stylua --locked
    fi
else
    echo "Unsupported OS: $OS" >&2
    exit 1
fi

echo ""
echo "=== Installing Language Servers & Formatters ==="

# 1. Python (ty, ruff)
if command -v uv &>/dev/null; then
    echo "Installing Python tools (ty, ruff) via uv..."
    uv tool install --force ty || uv tool upgrade ty || true
    uv tool install --force ruff || uv tool upgrade ruff || true
else
    echo "Warning: 'uv' not found. Skipping ty and ruff installation."
fi

# 2. JavaScript / TypeScript / JSON / ESLint / YAML / Prettier (Node.js)
if command -v npm &>/dev/null; then
    echo "Installing JS/TS/JSON/YAML tools via npm..."
    npm install -g \
        typescript \
        typescript-language-server \
        vscode-langservers-extracted \
        yaml-language-server \
        prettier
else
    echo "Warning: 'npm' not found. Skipping Node-based language servers."
fi

# 3. Go (gopls)
if command -v go &>/dev/null; then
    echo "Installing gopls via go..."
    go install golang.org/x/tools/gopls@latest
else
    echo "Warning: 'go' not found. Skipping gopls installation."
fi

# 4. C# / .NET (csharp-ls, csharpier)
if command -v dotnet &>/dev/null; then
    echo "Installing C# tools via dotnet..."
    dotnet tool install -g csharp-ls || dotnet tool update -g csharp-ls || true
    dotnet tool install -g csharpier || dotnet tool update -g csharpier || true
else
    echo "Warning: 'dotnet' not found. Skipping csharp-ls and csharpier."
fi

# 5. TOML (taplo)
if command -v cargo &>/dev/null; then
    echo "Installing taplo via cargo..."
    cargo install taplo-cli --locked --features lsp || true
elif command -v brew &>/dev/null; then
    brew install taplo || true
fi

echo ""
echo "=== Installing Treesitter Parsers ==="
if command -v nvim &>/dev/null; then
    echo "Compiling Treesitter parsers ahead-of-time in Neovim..."
    nvim --headless "+TSInstallSync python typescript tsx javascript go c_sharp lua json yaml toml markdown" +qa
fi

echo ""
echo "Setup complete! Run 'nvim' and check ':checkhealth vim.lsp'."
