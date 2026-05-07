local M = {}

local actions = require("diffview.actions")

M.review = function()
	local branches = vim.fn.systemlist("git branch -a --format='%(refname:short)' 2>/dev/null")
	if vim.v.shell_error ~= 0 or #branches == 0 then
		vim.notify("Not a git repository or no branches found", vim.log.levels.ERROR)
		return
	end

	table.sort(branches, function(a, b)
		local a_remote = a:match("^remotes/")
		local b_remote = b:match("^remotes/")
		if a_remote and not b_remote then return false end
		if not a_remote and b_remote then return true end
		return a < b
	end)

	vim.ui.select(branches, {
		prompt = "Select base branch to review against:",
	}, function(choice)
		if choice then
			vim.cmd("DiffviewOpen " .. choice .. "...HEAD")
		end
	end)
end

require("diffview").setup({
    enhanced_diff_hl = true,
    show_help_hints = false,
    view = {
        default = { winbar_info = false },
        merge_tool = {
            layout = "diff3_mixed",
            disable_diagnostics = true,
            winbar_info = true,
        },
        file_history = { winbar_info = false },
    },
    file_panel = {
        listing_style = "tree",
        tree_options = {
            flatten_dirs = true,
            folder_statuses = "only_folded",
        },
        win_config = {
            position = "left",
            width = 35,
        },
    },
    keymaps = {
        view = {
            { "n", "<tab>", actions.select_next_entry, { desc = "Next file" } },
            { "n", "<s-tab>", actions.select_prev_entry, { desc = "Prev file" } },
            { "n", "<leader>gf", actions.toggle_files, { desc = "Toggle file panel" } },
            { "n", "<leader>e", actions.focus_files, { desc = "Focus file panel" } },
            { "n", "q", actions.close, { desc = "Close diffview" } },
        },
        file_panel = {
            { "n", "j", actions.next_entry, { desc = "Next entry" } },
            { "n", "k", actions.prev_entry, { desc = "Prev entry" } },
            { "n", "<cr>", actions.select_entry, { desc = "Open diff" } },
            { "n", "s", actions.toggle_stage_entry, { desc = "Stage/unstage" } },
            { "n", "S", actions.stage_all, { desc = "Stage all" } },
            { "n", "U", actions.unstage_all, { desc = "Unstage all" } },
            { "n", "X", actions.restore_entry, { desc = "Restore entry" } },
            { "n", "R", actions.refresh_files, { desc = "Refresh" } },
            { "n", "<tab>", actions.select_next_entry, { desc = "Next file" } },
            { "n", "<s-tab>", actions.select_prev_entry, { desc = "Prev file" } },
            { "n", "<leader>gf", actions.toggle_files, { desc = "Toggle file panel" } },
            { "n", "q", actions.close, { desc = "Close diffview" } },
        },
        file_history_panel = {
            { "n", "j", actions.next_entry, { desc = "Next entry" } },
            { "n", "k", actions.prev_entry, { desc = "Prev entry" } },
            { "n", "<cr>", actions.select_entry, { desc = "Open diff" } },
            { "n", "y", actions.copy_hash, { desc = "Copy commit hash" } },
            { "n", "q", actions.close, { desc = "Close diffview" } },
        },
    },
})

return M
