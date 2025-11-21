local map = vim.keymap.set

vim.g.mapleader = " "

map('n', '<leader>w', '<Cmd>write<CR>')
map('i', 'jk', '')
map('n', '<leader>q', '<Cmd>:quit<CR>')
map('n', '<leader>op', '<Cmd>:!open ./<CR>')
map('n', '<leader>h', ':Pick help<CR>')
map('n', '<leader>f', ':Pick files tool="git"<CR>')
map('n', 'Q', '@@')

map({ 'n', 'v' }, '<leader>z', '1z=', { silent = true })
map('n', 'U', '<C-r>')


map({ 'n', 'v', 'x' }, ';', ':')
map({ 'n', 'v' }, '<leader>n', ':norm ')
map({ 'n', 'v' }, '<leader>y', '"+y')
map({ 'n', 'v' }, '<leader>p', '"+p')

map('n', '<leader>m', '<Cmd>:Mason<CR>')
map('n', '<leader>li', ':LspInfo<CR>')
map('n', '<leader>lf', vim.lsp.buf.format)


local function pack_clean()
  local active_plugins = {}
  local unused_plugins = {}

  for _, plugin in ipairs(vim.pack.get()) do
    active_plugins[plugin.spec.name] = plugin.active
  end

  for _, plugin in ipairs(vim.pack.get()) do
    if not active_plugins[plugin.spec.name] then
      table.insert(unused_plugins, plugin.spec.name)
    end
  end

  if #unused_plugins == 0 then
    print("No unused plugins.")
    return
  end

  local choice = vim.fn.confirm("Remove unused plugins?", "&Yes\n&No", 2)
  if choice == 1 then
    vim.pack.del(unused_plugins)
  end
end


map({ 'n' }, '<leader>pc', pack_clean)
