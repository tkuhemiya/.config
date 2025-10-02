
[[ -f "/opt/homebrew/bin/brew" ]] && eval "$(/opt/homebrew/bin/brew shellenv)";
export PATH="$HOME/go/bin:$PATH"

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

# KeyBinds
openGitHub() {
  zle -I 
  open https://github.com/tkuhemiya;
  zle reset-prompt
}
zle -N openGitHub

openHere() {
  zle -I
  open ./
  zle prompt
}
zle -N openHere

bindkey '\eg' openGitHub
bindkey '\eo' openHere

# Prompt
autoload -Uz vcs_info
zstyle ':vcs_info:git:*' formats '(%b%u)'
zstyle ':vcs_info:git:*' actionformats '(%b|%a)'
precmd() { vcs_info }
setopt PROMPT_SUBST

export PROMPT='
%F{203}%n%f%B%F{203}@ %f%b%F{210}%~%f %F{47}${vcs_info_msg_0_} 
%F{203}>> %f'

# Auto Complete
zmodload zsh/complist
autoload -U compinit && compinit
autoload -U colors && colors

zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'
zstyle ':completion:*' menu select
zstyle ':completion:*' special-dirs true
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

# TODO
# uninstall p10k

#THIS MUST BE AT THE END OF THE FILE FOR SDKMAN TO WORK!!!
export SDKMAN_DIR="$HOME/.sdkman"
[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"
