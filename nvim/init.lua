require('options')

vim.pack.add({
    { src = "https://github.com/nvim-mini/mini.nvim" },

    { src = "https://github.com/catppuccin/nvim" },

    { src = "https://github.com/mason-org/mason.nvim" },
    { src = "https://github.com/neovim/nvim-lspconfig" },
    { src = "https://github.com/mason-org/mason-lspconfig.nvim" },
    { src = "https://github.com/WhoIsSethDaniel/mason-tool-installer.nvim" },
})

require('lsp')
require('plugin')
require('keymap')
require('autocmd')

require("catppuccin").setup({
    flavour = "mocha",
    transparent_background = true,
})
vim.cmd.colorscheme "catppuccin"
require('starter')
