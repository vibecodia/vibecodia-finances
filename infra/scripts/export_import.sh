#!/bin/bash

# Verifica se a variável MONGO_URI está definida
if [ -z "$MONGO_URI" ]; then
    echo "Erro: A variável de ambiente MONGO_URI não está definida."
    exit 1
fi

if [ -z "$MONGO_URI_TEST" ]; then
    echo "Erro: A variável de ambiente MONGO_URI não está definida."
    exit 1
fi

# Configurações
SOURCE_DB="household_db"  # Banco de origem
TARGET_DB="household_db_test"           # Banco de destino
COLLECTION="transactions"     # Coleção a ser transferida
OUTPUT_FILE="temp_export.json"

# Cria um diretório temporário com permissões adequadas
TEMP_DIR=$(mktemp -d)
chmod 777 "$TEMP_DIR"

echo "🔽 Exportando dados de $SOURCE_DB.$COLLECTION..."
docker run --rm \
  -v "$TEMP_DIR:/data" \
  mongo:latest \
  bash -c "mongoexport --uri=\"$MONGO_URI\" --db=$SOURCE_DB --collection=$COLLECTION --out=/data/$OUTPUT_FILE --jsonArray && chmod 666 /data/$OUTPUT_FILE"

if [ ! -f "$TEMP_DIR/$OUTPUT_FILE" ]; then
    echo "❌ Falha na exportação!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "🔼 Importando dados para $TARGET_DB.$COLLECTION..."
docker run --rm \
  -v "$TEMP_DIR:/data" \
  mongo:latest \
  bash -c "mongoimport --uri=\"$MONGO_URI_TEST\" --db=$TARGET_DB --collection=$COLLECTION --file=/data/$OUTPUT_FILE --jsonArray"

# Limpeza
rm -rf "$TEMP_DIR"
echo "✅ Concluído! Dados transferidos de $SOURCE_DB para $TARGET_DB (coleção: $COLLECTION)"