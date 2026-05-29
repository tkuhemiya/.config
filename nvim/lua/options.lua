-- Leaders
vim.g.mapleader = " "
vim.g.maplocalleader = " "

vim.opt.swapfile = false

-- Reload file when changed externally.
vim.o.autoread = true
vim.api.nvim_create_autocmd("FileChangedShellPost", {
  callback = function()
    vim.notify("File changed on disk. Buffer reloaded.")
  end,
})

vim.opt.mouse = "a"
vim.opt.wrap = true
vim.opt.linebreak = true      -- wrap at word boundaries
vim.opt.breakindent = true    -- preserve indent on wrapped lines
vim.opt.scrolloff = 10
vim.opt.undofile = true
vim.opt.splitbelow = true

-- Indentation
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.smartindent = true

-- Appearance / UI
vim.opt.number = true
vim.opt.showmode = false     -- statusline does this
vim.opt.cursorcolumn = false -- fix jumps
vim.opt.signcolumn = "yes"   -- gutter never shifts
vim.opt.termguicolors = true -- 24-bit color baby
vim.opt.showtabline = 0      -- lualine handles tabs in statusline
vim.opt.laststatus = 3       -- global statusline shared across splits
vim.opt.winborder = "rounded"

-- Search
vim.opt.ignorecase = true
vim.opt.smartcase = true

-- Hide bottom cmdline area when idle
vim.opt.cmdheight = 0

-- Completion popup menu
vim.opt.pumheight = 10       -- max 10 items at a time
vim.opt.pummaxwidth = 80
vim.opt.pumborder = "rounded"
vim.opt.completeopt = { "menuone", "noinsert" }

-- LSP / syntax highlights
vim.cmd([[hi @lsp.type.number gui=bold]])
