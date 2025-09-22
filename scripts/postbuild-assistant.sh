#!/bin/bash
# Copia os arquivos necessários para o dist e injeta o assistant-button.html no index.html

set -e

SRC_DIR="$(dirname "$0")"
ROOT_DIR="$SRC_DIR/.."
DIST_DIR="$ROOT_DIR/dist"

# Copiar o JS minificado para o dist
cp "$SRC_DIR/vibecodia-assist.min.js" "$DIST_DIR/vibecodia-assist.min.js"

# Injetar o assistant-button.html no index.html após a abertura do <body>
ASSISTANT_SCRIPT=$(cat "$SRC_DIR/assistant-button.html")

# Usar awk para inserir após a tag <body>
awk -v script="$ASSISTANT_SCRIPT" '
  /<body>/ && !x {print; print script; x=1; next} 1
' "$DIST_DIR/index.html" > "$DIST_DIR/index.html.tmp" && mv "$DIST_DIR/index.html.tmp" "$DIST_DIR/index.html"
