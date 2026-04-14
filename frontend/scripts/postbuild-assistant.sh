#!/bin/bash
# Copia os arquivos necessários para o dist e injeta o assistant-button.html no index.html

set -e

SRC_DIR="$(dirname "$0")"
ROOT_DIR="$SRC_DIR/.."
DIST_DIR="$ROOT_DIR/../dist"
PUBLIC_DIR="$ROOT_DIR/../public"

# Copiar o manifest.json do public para o dist (garante que a versão correta seja usada)
if [ -f "$PUBLIC_DIR/manifest.json" ]; then
    cp "$PUBLIC_DIR/manifest.json" "$DIST_DIR/manifest.json"
    echo "✅ Copied manifest.json to dist with version: $(grep '\"name\"' "$DIST_DIR/manifest.json" | head -1)"
fi

# Copiar o JS minificado para o dist
cp "$SRC_DIR/vibecodia-assist.min.js" "$DIST_DIR/vibecodia-assist.min.js"

# Injetar o assistant-button.html no index.html após a abertura do <body>
ASSISTANT_SCRIPT=$(cat "$SRC_DIR/assistant-button.html")

# Usar awk para inserir após a tag <body>
awk -v script="$ASSISTANT_SCRIPT" '
  /<body>/ && !x {print; print script; x=1; next} 1
' "$DIST_DIR/index.html" > "$DIST_DIR/index.html.tmp" && mv "$DIST_DIR/index.html.tmp" "$DIST_DIR/index.html"
