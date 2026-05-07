-- Start treesitter for specific filetypes
vim.api.nvim_create_autocmd('FileType', {
	pattern = {
		'c', 'cpp', 'go', 'javascript', 'javascriptreact',
		'lua', 'markdown', 'python', 'rust', 'typescript',
		'typescriptreact', 'typst', 'zig',
	},
	callback = function()
		vim.treesitter.start()
	end,
})

local treesitter_group = vim.api.nvim_create_augroup("dmmulroy-treesitter-main", { clear = true })

vim.api.nvim_create_autocmd("FileType", {
	group = treesitter_group,
	callback = function(args)
		pcall(vim.treesitter.start, args.buf)

		local filetype = vim.bo[args.buf].filetype

		if not vim.treesitter.get_parser(args.buf, nil, { error = false }) then
			return
		end

		local language = vim.treesitter.language.get_lang(filetype)
		if not language then
			return
		end

		local has_indents, query = pcall(vim.treesitter.query.get, language, "indents")
		if has_indents and query then
			vim.bo[args.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
		end
	end,
})
