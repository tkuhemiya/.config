
[[ -f "/opt/homebrew/bin/brew" ]] && eval "$(/opt/homebrew/bin/brew shellenv)";
export PATH="$HOME/go/bin:$PATH"
export PATH=$PATH:~/Library/Android/sdk/platform-tools

export KEYTIMEOUT=1
source <(fzf --zsh) 
export MATLAB_JAVA=/Users/themiya/.sdkman/candidates/java/11.0.23-amzn
eval "$(zoxide init zsh)"

# Custom
source ~/.config/zsh/utils/mvnHelp.zsh

# ALias
alias c='clear'
alias vs='code ./'
alias vi='nvim'
alias cd='z'
alias ls='ls -G'
alias l='ls -lGAhLS'
alias o='open'
alias dk='docker'

# KeyBinds
openHere() {
  zle -I
  open ./
  zle prompt
}
zle -N openHere

bindkey '\eo' openHere

# Prompt
autoload -Uz vcs_info
zstyle ':vcs_info:git:*' formats '(%b%u)'
zstyle ':vcs_info:git:*' actionformats '(%b|%a)'
precmd() { vcs_info }
setopt PROMPT_SUBST

export PROMPT='
%F{255}%n%f%B% @ %f%b%F{255}%~%f %F{47}${vcs_info_msg_0_} 
%F{255}$ %f'

# Auto Complete
zmodload zsh/complist
autoload -U compinit && compinit
autoload -U colors && colors

zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # case insensitive
zstyle ':completion:*' menu select
zstyle ':completion:*' special-dirs false
zstyle ':completion:*' squeeze-slashes false 

export FZF_CTRL_T_OPTS="
  --walker-skip .git,node_modules,target,venv,__pycache__
  --preview '[[ -d {} ]] && { ls -p --color=always {} } || { [[ {} == *.png || {} == *.jpg || {} == *.jpeg ]] && { chafa --clear -f symbols --symbols all --view-size=50x {} } || bat -n --theme=Nord --color=always --line-range=:40 {} }'
  --preview-window=right:40%
"

# History
HISTSIZE=5000
HISTFILE=~/.cache/zsh/.zsh_history
SAVEHIST=$HISTSIZE
HISTDUP=erase

# syntax highlighting --should be last
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

#THIS MUST BE AT THE END OF THE FILE FOR SDKMAN TO WORK!!!
export SDKMAN_DIR="$HOME/.sdkman"
[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"

# Created by `pipx` on 2025-10-21 05:59:09
export PATH="$PATH:/Users/themiya/.local/bin"

