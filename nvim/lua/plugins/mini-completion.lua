local keymap = vim.keymap.set
local ls = require("luasnip")

-- Tab: completion navigation if popup visible, else snippet expand, else tab
keymap('i', '<Tab>', function()
  if vim.fn.pumvisible() == 1 then
    return vim.api.nvim_replace_termcodes('<C-n>', true, false, true)
  end
  if ls.expand_or_jumpable() then
    ls.expand_or_jump(1)
    return ''
  end
  return vim.api.nvim_replace_termcodes('<Tab>', true, false, true)
end, { expr = true })

keymap('i', '<S-Tab>', function()
  if vim.fn.pumvisible() == 1 then
    return vim.api.nvim_replace_termcodes('<C-p>', true, false, true)
  end
  if ls.jumpable(-1) then
    ls.jump(-1)
    return ''
  end
  return vim.api.nvim_replace_termcodes('<S-Tab>', true, false, true)
end, { expr = true })

-- CR: confirm completion if popup visible, else snippet jump, else insert newline
keymap('i', '<CR>', function()
  if vim.fn.pumvisible() == 1 then
    return vim.api.nvim_replace_termcodes('<C-y>', true, false, true)
  end
  if ls.jumpable(1) then
    ls.jump(1)
    return ''
  end
  return vim.api.nvim_replace_termcodes('<CR>', true, false, true)
end, { expr = true })

require('mini.completion').setup({
    delay = { completion = 10, info = 100, signature = 10 },
    mappings = {
        force_twostep = '<C-Space>',
    },
    window = {
        info = { border = 'single' },
        signature = { border = 'single' },
    },
    lsp_completion = {
        source_func = 'omnifunc',
        auto_setup = true,
    },
})
