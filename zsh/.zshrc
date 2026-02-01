
export KEYTIMEOUT=1
eval "$(zoxide init zsh)"

# Modules
zmodload zsh/complist
#autoload -U compinit && compinit autoload -U colors && colors

zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}' # case insensitive
zstyle ':completion:*' special-dirs false
zstyle ':completion:*' squeeze-slashes false 

source <(fzf --zsh) 
source ~/.config/zsh/mvnv.zsh


# Custom
source ~/.config/zsh/func.zsh
openFinder() {
  open ./
}
zle -N openFinder
bindkey '^O' openFinder

# ALias
#alias bat='bat -p --theme TwoDark -l sh'
alias cd='z'
alias c='clear'
alias vs='code ./'
alias vi='nvim'
alias vs='code ./'
alias ls='ls -G'
alias l='ls -lAhG -S '
alias cat='bat -pp'
alias o='open'
alias dk='docker'
alias tree="erd -C auto -I -H -s name -y inverted"
alias lg='lazygit'
mkcd() {
  mkdir $1
  cd $1
}

# History
HISTSIZE=5000
HISTFILE=~/.cache/zsh/.zsh_history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt HIST_IGNORE_DUPS
setopt HIST_SAVE_NO_DUPS


bindkey '\eo' openHere

# Prompt
autoload -Uz vcs_info
#zstyle ':vcs_info:git:*' formats '(%b%u)'
zstyle ':vcs_info:git*' formats "%F{green}%b%f %m%u%c %a "
zstyle ':vcs_info:git:*' actionformats '(%b|%a)'
precmd() { vcs_info }
setopt PROMPT_SUBST

export PROMPT='
%F{255}%n%f%B% @ %f%b%F{255}%~%f %F{47}${vcs_info_msg_0_} 
%F{255}$ %f'

export FZF_CTRL_T_OPTS="
  --walker-skip .git,node_modules,target,venv,__pycache__
  --preview '[[ -d {} ]] && { ls -p --color=always {} } || { [[ {} == *.png || {} == *.jpg || {} == *.jpeg ]] && { chafa --clear -f symbols --symbols all --view-size=50x {} } || bat -n --theme=Nord --color=always --line-range=:40 {} }'
  --preview-window=right:40%
"

#THIS MUST BE AT THE END OF THE FILE FOR SDKMAN TO WORK!!!
[[ -s "$XDG_DATA_HOME/sdkman/bin/sdkman-init.sh" ]] && source "$XDG_DATA_HOME/sdkman/bin/sdkman-init.sh"

# syntax highlighting --should be last
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh


# bun completions
[ -s "/Users/themiya/.bun/_bun" ] && source "/Users/themiya/.bun/_bun"
