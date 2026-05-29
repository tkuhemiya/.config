local M = {}

local ls = require("luasnip")
local builtin = require("telescope.builtin")
local Minifile = require("mini.files")
local diffview = require("plugins.diffview")
local map = vim.keymap.set

vim.g.mapleader = " "

-- Buffer / window management
map({ "n" }, "<leader>w", "<Cmd>w<CR>", { desc = "Write buffer" })
map({ "n" }, "<leader>q", "<Cmd>q<CR>", { desc = "Close window" })
map({ "n" }, "q", "<Cmd>qa<CR>", { desc = "Quit all" })
map({ "n" }, "<leader>Q", "<Cmd>wqa<CR>", { desc = "Write all, quit" })
map({ "n" }, "<leader>e", function() Minifile.open() end, { desc = "Open mini.files" })
map({ "n" }, "<C-q>", ":copen<CR>", { desc = "Open quickfix", silent = true })
map({ "n", "t" }, "<Leader>x", "<Cmd>tabclose<CR>", { desc = "Close current tab" })
map({ "n", "t" }, "<Leader>t", "<Cmd>split<CR> <Cmd>term<CR>i", { desc = "Open terminal split" })
map({ "t" }, "<Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

--- Buffer
map('n', '<Tab>', '<Cmd>bnext<CR>', { desc = 'Next Buffer' })
map('n', '<S-Tab>', '<Cmd>bprev<CR>', { desc = 'Prev Buffer' })
map('n', '<Leader><Tab>', '<Cmd>bdelete<CR>', { desc = 'Close Buffer' })

-- System clipboard
map({ "n" }, "<leader>p", '"+p', { desc = "Paste from clipboard" })
map({ "n", "x" }, "<leader>y", '"+y', { desc = "Yank to clipboard" })

-- Quick navigation
map('n', 'U', '<C-r>')                 -- redo
map('n', 'Q', '@@')                    -- replay last macro
map("n", "L", "$", { desc = "End of line" })
map("n", "H", "^", { desc = "Start of line" })
map({ "n", "x" }, "L", "$", { desc = "End of line" })
map({ "n", "x" }, "H", "^", { desc = "Start of line" })

-- Search navigation (centered)
vim.keymap.set("n", "n", "nzz", { desc = "Next result centered" })
vim.keymap.set("n", "N", "Nzz", { desc = "Prev result centered" })
--vim.keymap.set("n", "<ESC>", ":nohlsearch<CR>", { desc = "Clear highlights" })

-- Find / replace
vim.keymap.set("n", "S", function()
	local cmd = ":%s/<C-r><C-w>/<C-r><C-w>/gI<Left><Left><Left>"
	local keys = vim.api.nvim_replace_termcodes(cmd, true, false, true)
	vim.api.nvim_feedkeys(keys, "n", false)
end, { desc = "Replace word under cursor" })
vim.keymap.set("n", "<leader>S", function()
	require("spectre").toggle()
end, { desc = "Toggle Spectre" })
vim.keymap.set("n", "<leader>sw", function()
	require("spectre").open_visual({ select_word = true })
end, { desc = "Spectre word under cursor" })
map({ "n", "v", "x" }, "<C-s>", [[:s/\V]], { desc = "Literal substitution" })

-- Window navigation (nvim + tmux)
local function tmux_or_win(dir)
	local cmd = "NvimTmuxNavigate" .. dir
	return function()
		if vim.fn.exists(":" .. cmd) ~= 0 then
			vim.cmd[cmd]()
		else
			vim.cmd.wincmd(dir:sub(1, 1):lower())
		end
	end
end
vim.keymap.set("n", "<C-j>", tmux_or_win("Down"), { desc = "Down" })
vim.keymap.set("n", "<C-k>", tmux_or_win("Up"), { desc = "Up" })
vim.keymap.set("n", "<C-l>", tmux_or_win("Right"), { desc = "Right" })
vim.keymap.set("n", "<C-h>", tmux_or_win("Left"), { desc = "Left" })

-- Window resizing
map({ "n" }, "<M-n>", "<cmd>resize +2<CR>", { desc = "Increase height" })
map({ "n" }, "<M-e>", "<cmd>resize -2<CR>", { desc = "Decrease height" })
map({ "n" }, "<M-i>", "<cmd>vertical resize +5<CR>", { desc = "Increase width" })
map({ "n" }, "<M-m>", "<cmd>vertical resize -5<CR>", { desc = "Decrease width" })

-- Tab navigation (1-8)
for i = 1, 8 do
	map({ "n", "t" }, "<Leader>" .. i, "<Cmd>tabnext " .. i .. "<CR>", { desc = "Go to tab " .. i })
end

-- Telescope
map({ "n" }, "<leader>f", builtin.find_files, { desc = "Find files" })
map({ "n" }, "<leader>b", builtin.buffers, { desc = "Find buffers" })
map({ "n" }, "<leader>sg", builtin.live_grep, { desc = "Live grep" })
map({ "n" }, "<leader>si", builtin.grep_string, { desc = "Grep string under cursor" })
map({ "n" }, "<leader>sr", builtin.lsp_references, { desc = "LSP references" })
map({ "n" }, "<leader>sd", builtin.diagnostics, { desc = "Diagnostics" })
map({ "n" }, "<leader>sk", builtin.keymaps, { desc = "Show keymaps" })
map({ "n" }, "<leader>se", "<cmd>Telescope env<cr>", { desc = "Environment variables" })
map({ "n" }, "<leader>sa", require("actions-preview").code_actions, { desc = "Code actions" })

-- Diffview
map({ "n" }, "<leader>gd", "<cmd>DiffviewOpen<cr>", { desc = "Open diffview" })
map({ "n" }, "<leader>gD", diffview.review, { desc = "Code review" })
map({ "n" }, "<leader>gc", "<cmd>DiffviewClose<cr>", { desc = "Close diffview" })
map({ "n" }, "<leader>gh", "<cmd>DiffviewFileHistory %<cr>", { desc = "File history (current)" })
map({ "n" }, "<leader>gH", "<cmd>DiffviewFileHistory<cr>", { desc = "File history (repo)" })

-- Marks
map({ "n" }, "<leader>dm", function()
	require("marks").delete()
end, { desc = "Delete mark under cursor" })
map({ "x" }, "<leader>dm", function()
	require("marks").delete_buf()
end, { desc = "Delete all marks in buffer" })
map({ "n" }, "<leader>m", function()
	require("marks").preview()
end, { desc = "Show all marks (quickfix)" })

-- Editor helpers
map({ "n", "v", "x" }, "<leader>r", ":edit!<CR>", { desc = "Reload buffer" })
map({ "n", "v", "x" }, "<leader>n", ":norm ", { desc = "Normal command" })
map({ "n", "v", "x" }, "<leader>lf", vim.lsp.buf.format, { desc = "Format buffer" })
vim.keymap.set("v", "<", "<gv", { desc = "Indent left" })
vim.keymap.set("v", ">", ">gv", { desc = "Indent right" })

-- Highlight yank
vim.api.nvim_create_autocmd("TextYankPost", {
	group = vim.api.nvim_create_augroup("highlight_yank", { clear = true }),
	pattern = "*",
	desc = "Highlight selection on yank",
	callback = function()
		vim.highlight.on_yank({ timeout = 200, visual = true })
	end,
})

-- Luasnip
map({ "i", "s" }, "<C-e>", function() ls.expand_or_jump(1) end, { silent = true, desc = "Expand or jump forward" })
map({ "i", "s" }, "<C-J>", function() ls.jump(1) end, { silent = true, desc = "Jump forward" })
map({ "i", "s" }, "<C-K>", function() ls.jump(-1) end, { silent = true, desc = "Jump backward" })

-- Misc
map({ "n" }, "<C-f>", "<Cmd>Open .<CR>", { desc = "Open in Finder" })

-- LSP on_attach keymaps
function M.on_attach(client, bufnr)
	local bufmap = function(mode, lhs, rhs, desc)
		vim.keymap.set(mode, lhs, rhs, { buffer = bufnr, desc = desc })
	end

	bufmap("n", "gd", vim.lsp.buf.definition, "Go to definition")
	bufmap("n", "gr", vim.lsp.buf.references, "Go to references")
	bufmap("n", "gI", vim.lsp.buf.implementation, "Go to implementation")
	bufmap("n", "K", vim.lsp.buf.hover, "Hover documentation")
	bufmap("n", "<leader>rn", vim.lsp.buf.rename, "Rename symbol")
	bufmap("n", "<leader>ca", vim.lsp.buf.code_action, "Code action")
	bufmap("n", "<leader>lf", function() vim.lsp.buf.format({ async = true }) end, "Format buffer")
end

return M
