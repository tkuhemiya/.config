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
map({ "n", "x" }, "H", "^", { desc = "Start of line" })
map("x", "L", "$", { desc = "End of line" })
map("n", "L", function()
	vim.diagnostic.open_float({ border = "rounded" })
end, { desc = "Open diagnostic float" })

-- Search navigation (centered)
map("n", "/", function()
	local word = vim.fn.expand("<cword>")
	if word == "" then
		return "/"
	end
	return "/" .. vim.fn.escape(word, [[\/.*$^~[]])
end, { expr = true, desc = "Search word under cursor" })

vim.keymap.set("n", "n", "nzz", { desc = "Next result centered" })
vim.keymap.set("n", "N", "Nzz", { desc = "Prev result centered" })
--vim.keymap.set("n", "<ESC>", ":nohlsearch<CR>", { desc = "Clear highlights" })

-- Find / replace
vim.keymap.set("n", "S", function()
	local cmd = ":%s/<C-r><C-w>/<C-r><C-w>/gI<Left><Left><Left>"
	local keys = vim.api.nvim_replace_termcodes(cmd, true, false, true)
	vim.api.nvim_feedkeys(keys, "n", false)
end, { desc = "Replace word under cursor" })
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
map({ "n" }, "<leader><leader>", builtin.live_grep, { desc = "Live grep" })
map({ "n" }, "<leader>si", builtin.grep_string, { desc = "Grep string under cursor" })
map({ "n" }, "<leader>sr", builtin.lsp_references, { desc = "LSP references" })
map({ "n" }, "<leader>ss", builtin.lsp_document_symbols, { desc = "Document symbols" })
map({ "n" }, "<leader>sd", builtin.diagnostics, { desc = "Diagnostics" })
map({ "n" }, "<leader>sk", builtin.keymaps, { desc = "Show keymaps" })
map({ "n", "v" }, "<leader>ca", require("actions-preview").code_actions, { desc = "Code action preview" })

-- Diagnostics
local function jump_diagnostic(count, severity)
  local ok = pcall(vim.diagnostic.jump, {
    count = count,
    severity = severity,
    float = false,
  })
  if ok then
    vim.cmd("normal! zz")
  end
end

map("n", "]d", function()
  jump_diagnostic(1)
end, { desc = "Next diagnostic" })
map("n", "[d", function()
  jump_diagnostic(-1)
end, { desc = "Previous diagnostic" })
map("n", "]e", function()
  jump_diagnostic(1, vim.diagnostic.severity.ERROR)
end, { desc = "Next error" })
map("n", "[e", function()
  jump_diagnostic(-1, vim.diagnostic.severity.ERROR)
end, { desc = "Previous error" })
map("n", "<leader>d", function()
  vim.diagnostic.open_float({ border = "rounded" })
end, { desc = "Open diagnostic float" })
map("n", "<leader>ld", vim.diagnostic.setqflist, { desc = "Send diagnostics to quickfix" })
map("n", "<leader>cn", "<Cmd>cnext<CR>zz", { desc = "Next quickfix item" })
map("n", "<leader>cp", "<Cmd>cprevious<CR>zz", { desc = "Previous quickfix item" })
map("n", "<leader>co", "<Cmd>copen<CR>zz", { desc = "Open quickfix" })
map("n", "<leader>cc", "<Cmd>cclose<CR>", { desc = "Close quickfix" })

-- Diffview
map({ "n" }, "<leader>gD", "<cmd>DiffviewOpen<cr>", { desc = "Open diffview" })
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
map({ "n", "v", "x" }, "<leader>lf", function()
	require("conform").format({ lsp_format = "fallback" })
end, { desc = "Format buffer" })
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

-- Treesitter text objects and incremental selection
local function treesitter_select()
  local has_parser = vim.treesitter.get_parser(0, nil, { error = false })
  if not has_parser then
    return nil
  end

  local ok, select = pcall(require, "vim.treesitter._select")
  return ok and select or nil
end

map("n", "<C-Space>", function()
  local select = treesitter_select()
  if select then
    vim.cmd.normal({ "van", bang = true })
  else
    vim.lsp.buf.selection_range(1)
  end
end, { desc = "Start incremental selection" })
map("x", "<C-Space>", function()
  local select = treesitter_select()
  if select then
    select.select_parent(vim.v.count1)
  end
end, { desc = "Expand Treesitter selection" })
map("x", "<C-h>", function()
  local select = treesitter_select()
  if select then
    select.select_child(vim.v.count1)
  end
end, { desc = "Shrink Treesitter selection" })

local function treesitter_textobject(query)
  return function()
    require("nvim-treesitter-textobjects.select").select_textobject(query, "textobjects")
  end
end

local function treesitter_move(method, query)
  return function()
    require("nvim-treesitter-textobjects.move")[method](query, "textobjects")
  end
end

for _, object in ipairs({
  { "aa", "@parameter.outer", "Select outer parameter" },
  { "ia", "@parameter.inner", "Select inner parameter" },
  { "af", "@function.outer", "Select outer function" },
  { "if", "@function.inner", "Select inner function" },
  { "ac", "@class.outer", "Select outer class" },
  { "ic", "@class.inner", "Select inner class" },
}) do
  map({ "x", "o" }, object[1], treesitter_textobject(object[2]), { desc = object[3] })
end

for _, motion in ipairs({
  { "]m", "goto_next_start", "@function.outer", "Next function start" },
  { "[m", "goto_previous_start", "@function.outer", "Previous function start" },
  { "]M", "goto_next_end", "@function.outer", "Next function end" },
  { "[M", "goto_previous_end", "@function.outer", "Previous function end" },
  { "]]", "goto_next_start", "@class.outer", "Next class start" },
  { "[[", "goto_previous_start", "@class.outer", "Previous class start" },
  { "][", "goto_next_end", "@class.outer", "Next class end" },
  { "[]", "goto_previous_end", "@class.outer", "Previous class end" },
}) do
  map({ "n", "x", "o" }, motion[1], treesitter_move(motion[2], motion[3]), { desc = motion[4] })
end

-- Folding (native)
-- zm: toggle fold under cursor recursively (zA)
map("n", "zm", "zA", { desc = "Toggle fold under cursor", noremap = true })
-- zM: toggle all folds in the file
vim.keymap.set("n", "zM", function()
	if vim.o.foldlevel == 0 then
		vim.cmd("normal! zR")
	else
		vim.cmd("normal! zM")
	end
end, { desc = "Toggle all folds" })

-- Change working directory to current file's directory
map({ "n" }, "<leader>-", "<Cmd>lcd %:p:h<CR>", { desc = "Change dir to current file" })

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
	bufmap("n", "<leader>lf", function()
		require("conform").format({ lsp_format = "fallback" })
	end, "Format buffer")
end

return M
