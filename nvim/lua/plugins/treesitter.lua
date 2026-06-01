-- NOTE: tree-sitter CLI must be installed for parser installation to work:
--   brew install tree-sitter-cli
--
-- In Neovim 0.12, syntax highlighting is enabled automatically
-- when a parser is available; no setup() call is required.

local ts = require("nvim-treesitter")
local config = require("nvim-treesitter.config")

-- Auto-install missing parsers when opening a file
vim.api.nvim_create_autocmd("FileType", {
  group = vim.api.nvim_create_augroup("ts_auto_install", { clear = true }),
  callback = function(ev)
    local lang = vim.treesitter.language.get_lang(ev.match)
    if not lang then
      return
    end
    local installed = config.get_installed()
    if not vim.list_contains(installed, lang) then
      ts.install(lang):await(function(ok)
        if ok then
          vim.schedule(function()
            vim.notify("Installed parser: " .. lang, vim.log.levels.INFO)
            -- Refresh foldexpr now that parser is available
            vim.treesitter.start(ev.buf)
          end)
        end
      end)
    end
  end,
})
