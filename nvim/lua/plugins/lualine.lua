require("lualine").setup({
  options = {
    theme = "auto",
    globalstatus = true,
    component_separators = { left = "", right = "" },
    section_separators = { left = "", right = "" },
    disabled_filetypes = { statusline = {}, winbar = {} },
  },
  sections = {
    lualine_a = {
      {
        "tabs",
        max_length = function()
          return math.floor(vim.o.columns / 2)
        end,
        mode = 2,
        fmt = function(name, context)
          -- mode=2 appends tabnr; strip it to show filename only
          return name:gsub(" %d+$", "")
        end,
      },
      "mode",
    },
    lualine_b = {
      {
        "filename",
        path = 1,
        shorting_target = 40,
      },
    },
    lualine_c = {
      "branch",
      "diff",
    },
    lualine_x = {
      {
        "diagnostics",
        sources = { "nvim_lsp" },
        sections = { "error", "warn", "info", "hint" },
      },
    },
    lualine_y = {
      "filetype",
      "encoding",
    },
    lualine_z = {
      "location",
      "progress",
    },
  },
})
