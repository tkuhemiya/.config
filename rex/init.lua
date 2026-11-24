-- Migrated from ~/.config/tmux/tmux.conf (prefix ctrl+a) and ~/.config/ghostty/config

-- tmux: send the prefix through
rex.bind("ctrl+a>ctrl+a", "pane.send_key", { key = "ctrl+a" })

-- tmux: tabs
rex.bind("alt+1", "client.tab.goto", { index = 1 })
rex.bind("alt+2", "client.tab.goto", { index = 2 })
rex.bind("alt+3", "client.tab.goto", { index = 3 })
rex.bind("alt+4", "client.tab.goto", { index = 4 })
rex.bind("alt+5", "client.tab.goto", { index = 5 })
rex.bind("alt+6", "client.tab.goto", { index = 6 })
rex.bind("alt+7", "client.tab.goto", { index = 7 })
rex.bind("alt+8", "client.tab.goto", { index = 8 })
rex.bind("alt+9", "client.tab.goto", { index = 9 })
rex.bind("alt+enter", "client.tab.new")
rex.bind("alt+[", "client.tab.previous")
rex.bind("alt+]", "client.tab.next")

-- tmux: splits
rex.bind("ctrl+a>shift+\\", "pane.split", { direction = "right" })
rex.bind("ctrl+a>-", "pane.split", { direction = "down" })

-- tmux: pane focus
rex.bind("alt+h", "pane.focus", { direction = "left" })
rex.bind("alt+j", "pane.focus", { direction = "down" })
rex.bind("alt+k", "pane.focus", { direction = "up" })
rex.bind("alt+l", "pane.focus", { direction = "right" })

-- tmux: pane resize
rex.bind("alt+shift+h", "pane.resize", { amount = 5, direction = "left" })
rex.bind("alt+shift+j", "pane.resize", { amount = 5, direction = "down" })
rex.bind("alt+shift+k", "pane.resize", { amount = 5, direction = "up" })
rex.bind("alt+shift+l", "pane.resize", { amount = 5, direction = "right" })

-- tmux: close
rex.bind("alt+shift+x", "session.close")
rex.bind("alt+q", "client.tab.close")
rex.bind("alt+x", "pane.close")

-- tmux: rename and reload
rex.bind("ctrl+a>,", "client.tab.rename")
rex.bind("ctrl+a>r", "client.config.reload")

-- Ghostty
rex.bind("cmd+r", "client.config.reload")
