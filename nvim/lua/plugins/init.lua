require("plugins.treesitter")
require("plugins.lsp")
require("plugins.mini-completion")
require("plugins.mini-pairs")
require("plugins.mini-icons")
require('mini.files').setup({
  options = {
    -- Hide dotfiles by default (can toggle with `g.` in mini.files)
    permanent = false,
    -- Filter out specific dirs
    filter = function(entry)
      local ignored = { '.git', '.svn', 'node_modules', '.next', '.cache' }
      for _, name in ipairs(ignored) do
        if entry.name == name then return false end
      end
      return true
    end,
  },
})

-- Add <CR> to enter folders / open files in mini.files
vim.api.nvim_create_autocmd('FileType', {
  pattern = 'minifiles',
  callback = function(ev)
    vim.keymap.set('n', '<CR>', require('mini.files').go_in, { buffer = ev.buf, desc = 'Go in' })
  end,
})
require("plugins.telescope")
require("plugins.actions-preview")
require("plugins.luasnip")
require("plugins.diffview")
require("plugins.lualine")
require("plugins.render-markdown")
require("plugins.image")

require('marks').setup()

-- require('mini.diff').setup()
