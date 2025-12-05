#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title sg
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖
# @raycast.packageName dev
# @raycast.argument1 { "type": "text", "placeholder": "File path (optional)" }

# Documentation:
# @raycast.description search github
# @raycast.author themiya


file_path="$1"
query=$(pbpaste | sed 's/ /+/g')

language=""
if [ -n "$file_path" ]; then
    ext="${file_path##*.}"
    case "$ext" in
        py) language="Python" ;;
        js) language="JavaScript" ;;
        ts) language="TypeScript" ;;
        java) language="Java" ;;
        cpp|cxx|cc) language="C++" ;;
        c) language="C" ;;
        go) language="Go" ;;
        dart) language="Dart" ;;
        html) language="HTML" ;;
        css) language="CSS" ;;
        *) language="" ;;
    esac
fi

if [ -n "$language" ]; then
    url="https://github.com/search?q=$query+language%3A$language&type=code"
else
    url="https://github.com/search?q=$query&type=code"
fi

open "$url"

echo "$front_app : $query 🤓"
