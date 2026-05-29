require("image").setup({
	backend = "kitty",
	integrations = {
		markdown = { enabled = false },
		neorg = { enabled = false },
		typst = { enabled = false },
	},
	max_width = 100,
	max_height = 30,
	window_overlap_clear_enabled = true,
})

-- Render image files inline when opened
vim.api.nvim_create_autocmd({ "BufReadPost", "BufWinEnter" }, {
	pattern = { "*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp", "*.bmp" },
	callback = function(args)
		local ok, image = pcall(require, "image")
		if not ok then
			return
		end
		local buf = args.buf
		local win = vim.api.nvim_get_current_win()
		-- Clear buffer content so the image isn't competing with binary text
		vim.api.nvim_buf_set_lines(buf, 0, -1, false, {})
		pcall(function()
			local img = image.from_file(args.file, { window = win, buffer = buf })
			if img then
				img:render()
			end
		end)
	end,
})
