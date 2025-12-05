

export EDITOR="nvim"
export BROWSER="chrome"
export HISTFILE=~/.cache/zsh/.zsh_history
export ZDOTDIR="$HOME/.config/zsh"

export XDG_CONFIG_HOME="$HOME/.config"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_DATA_HOME="$HOME/.local/share/"
export XDG_STATE_HOME="$HOME/.local/state/"

# clean up
export CARGO_HOME="$XDG_DATA_HOME"/cargo
export DOCKER_CONFIG="$XDG_CONFIG_HOME"/docker
export MIX_XDG="true" # elixer
export FFMPEG_DATADIR="$XDG_CONFIG_HOME"/ffmpeg
export GOPATH="$XDG_DATA_HOME"/go
export GOMODCACHE="$XDG_CACHE_HOME"/go/mod
export MAVEN_OPTS=-Dmaven.repo.local="$XDG_DATA_HOME"/maven/repository
export MAVEN_ARGS="--settings $XDG_CONFIG_HOME/maven/settings.xml"
export MYSQL_HISTFILE="$XDG_DATA_HOME"/mysql_history
export NODE_REPL_HISTORY="$XDG_DATA_HOME"/node_repl_history
export NPM_CONFIG_USERCONFIG=$XDG_CONFIG_HOME/npm/npmrc # checkout npmrc section https://wiki.archlinux.org/title/XDG_Base_Directory#Partial
export PHP_HISTFILE="$XDG_STATE_HOME"/php/history
export OCTAVE_HISTFILE="$XDG_CACHE_HOME/octave-hsts" 
export OCTAVE_SITE_INITFILE="$XDG_CONFIG_HOME/octave/octaverc" # checkout octaverc https://wiki.archlinux.org/title/XDG_Base_Directory#Partial
export PSQLRC="$XDG_CONFIG_HOME/pg/psqlrc"
export PSQL_HISTORY="$XDG_STATE_HOME/psql_history"
export PGPASSFILE="$XDG_CONFIG_HOME/pg/pgpass"
export PGSERVICEFILE="$XDG_CONFIG_HOME/pg/pg_service.conf"
export PYENV_ROOT=$XDG_DATA_HOME/pyenv
export PYTHON_HISTORY=$XDG_STATE_HOME/python_history
export PYTHONPYCACHEPREFIX=$XDG_CACHE_HOME/python
export PYTHONUSERBASE=$XDG_DATA_HOME/python
export RIPGREP_CONFIG_PATH=$XDG_CONFIG_HOME/ripgrep/config
export RUSTUP_HOME="$XDG_DATA_HOME"/rustup
export SDKMAN_DIR="$XDG_DATA_HOME/sdkman"
export SQLITE_HISTORY=$XDG_STATE_HOME/sqlite_history

ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"


[[ -f "/opt/homebrew/bin/brew" ]] && eval "$(/opt/homebrew/bin/brew shellenv)";
export PATH="$GOPATH/bin:$PATH"
export PATH="$CARGO_HOME/bin/:$PATH"
export MATLAB_JAVA=$XDG_DATA_HOME/sdkman/candidates/java/11.0.23-amzn
