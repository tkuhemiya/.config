local telescope = require("telescope")

telescope.setup({
	defaults = {
        layout_strategy = 'horizontal',
        layout_config = {
            horizontal = {
                preview_width = 0.5,
            },
        },
		color_devicons = true,
		preview = { treesitter = true },
        file_ignore_patterns = { 'node_modules/' },
	}
})

telescope.load_extension("ui-select")
