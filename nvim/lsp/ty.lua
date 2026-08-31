-- Python Type Checker / Language Server (ty)
-- Install: uv tool install ty

---@type vim.lsp.Config
return {
  cmd = { "ty", "server" },
  filetypes = { "python" },
  root_markers = {
    ".venv",
    "ty.toml",
    "pyproject.toml",
    "uv.lock",
    "requirements.txt",
    "Pipfile",
    ".git",
  },
  single_file_support = false,
  before_init = function(_, config)
    -- Dynamically resolve virtual environment
    local root = config.root_dir
    local venv_path = vim.env.VIRTUAL_ENV
    if not venv_path and root then
      local local_venv = root .. "/.venv"
      if vim.uv.fs_stat(local_venv) then
        venv_path = local_venv
      end
    end

    if venv_path then
      local python_bin = venv_path .. "/bin/python"
      if vim.uv.fs_stat(python_bin) then
        config.settings = config.settings or {}
        config.settings.ty = config.settings.ty or {}
        config.settings.ty.pythonPath = python_bin
      end
    end
  end,
  settings = {
    -- ty = {
    --   -- Extra search paths for module resolution
    --   -- extraPaths = { "src", "lib" },
    -- },
  },
}
