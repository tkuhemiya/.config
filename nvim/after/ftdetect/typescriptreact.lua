-- Detect .jsx and .tsx files as typescriptreact
vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
	pattern = { "*.jsx", "*.tsx" },
	callback = function()
		vim.bo.filetype = "typescriptreact"
	end,
})
