require("options")
require("prelude")

vim.pack.add({
	{ src = "https://github.com/rose-pine/neovim", name = "rose-pine" },
	{ src = "https://github.com/nvim-mini/mini.nvim" },
	{ src = "https://github.com/nvim-mini/mini.pairs" },
	{ src = "https://github.com/chentoast/marks.nvim" },
	{ src = "https://github.com/nvim-mini/mini.files" },
	{ src = "https://github.com/aznhe21/actions-preview.nvim" },
	{ src = "https://github.com/nvim-lualine/lualine.nvim" },

	{ src = "https://github.com/nvim-telescope/telescope.nvim" },
	{ src = "https://github.com/sindrets/diffview.nvim" },

	{ src = "https://github.com/nvim-lua/plenary.nvim" },
	{ src = "https://github.com/L3MON4D3/LuaSnip" },
	{ src = "https://github.com/stevearc/conform.nvim" },
	{ src = "https://github.com/MeanderingProgrammer/render-markdown.nvim" },
	{ src = "https://github.com/nvim-treesitter/nvim-treesitter" },
	{ src = "https://github.com/nvim-treesitter/nvim-treesitter-textobjects" },
})

require("rose-pine").setup({
  styles = {
		transparency = true,
	}
})
vim.cmd.colorscheme "rose-pine"

require("plugins")
require("keymaps")

-- Native LSP servers (configured in ~/.config/nvim/lsp/<name>.lua)
vim.lsp.enable({
	"ty",
	"ruff",
	"ts_ls",
	"eslint",
	"gopls",
	"csharp_ls",
	"lua_ls",
	"jsonls",
	"yamlls",
	"taplo",
})
