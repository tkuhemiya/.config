vim.g.mapleader = " "
vim.g.maplocalleader = " "

require('options')

vim.pack.add({
    { src = "https://github.com/nvim-mini/mini.nvim" },
    { src = "https://github.com/nvim-treesitter/nvim-treesitter" },

    { src = "https://github.com/vague-theme/vague.nvim" },
    { src = "https://github.com/catppuccin/nvim", name = "catppuccin" },

    { src = "https://github.com/folke/flash.nvim" },
    { src = "https://github.com/mason-org/mason.nvim" },
    { src = "https://github.com/neovim/nvim-lspconfig" },
    { src = "https://github.com/mason-org/mason-lspconfig.nvim" },
    { src = "https://github.com/WhoIsSethDaniel/mason-tool-installer.nvim" },
    { src = "https://github.com/nvim-telescope/telescope.nvim" },
    { src = "https://github.com/nvim-lua/plenary.nvim" },
    { src = "https://github.com/folke/snacks.nvim" },
})

require('lsp')
require('plugin')
require('keymap')
require('autocmd')

require("catppuccin").setup({
    flavour = "mocha",
    transparent_background = false, 
    term_colors = true,
})

vim.cmd.colorscheme "catppuccin-nvim"

vim.o.cmdheight = 0
vim.o.laststatus = 3
require('starter')
