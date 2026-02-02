#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title sg
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖
# @raycast.packageName dev
# @raycast.argument1 { "type": "text", "placeholder": "language", "optional": true }

# Documentation:
# @raycast.description search github
# @raycast.author themiya

input_lang="$1"
query=$(pbpaste | sed 's/ /+/g')

case "$input_lang" in
    py) language="Python" ;;
    js) language="JavaScript" ;;
    ts) language="TypeScript" ;;
    *) language="$input_lang" ;;
esac

if [ -n "$language" ]; then
    url="https://github.com/search?q=${query}+language:${language}&type=code"
else
    url="https://github.com/search?q=${query}&type=code"
fi

open "$url"
echo "Searching GitHub for: $query"

language="$1"
query=$(pbpaste | sed 's/ /+/g')
