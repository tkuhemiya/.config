Output opencode-demo.gif
Output opencode-demo.mp4

Set FontSize 22
Set FontFamily "JetBrains Mono"
Set Width 1300
Set Height 800
Set TypingSpeed 80ms
Set Padding 40
Set Framerate 30

# Launch OpenCode
Type "opencode"
Enter

# Wait for the TUI to fully initialize
Sleep 4s

# Type a message to the agent
Type "HI"

# Send it
Enter

# Wait for the AI agent to process and respond
# (adjust this if the model takes longer/shorter)
Sleep 30s

# Quit OpenCode via slash command
Type "/q"
Enter

# Give it a moment to exit
Sleep 2s
