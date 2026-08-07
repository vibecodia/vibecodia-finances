# Runbook de Migração de Produção — `household_db`

Converter categorias/meios de pagamento **legados (strings)** → **ObjectId refs**
no banco de produção (`household_db`), sem alterar saldo e **sem criar
transações**.

> ⚠️ Leia as **Restrições** no final antes de executar qualquer comando de gravação.

## Contexto em 1 parágrafo

O refactor de categorias transformou `Transaction.category`/`paymentMethod` em
**ObjectId** (referência à coleção `Category`). Em produção os dados ainda
gravam **strings legadas** ("Aporte", "PIX", "Flash"...). Sem converter, o
código novo hidrata a string como `undefined` → categorias "undefined" e saldo
quebrado (−100k). A migração troca **apenas a representação** da
categoria/meio de pagamento — não toca `amount`/`date`/`type`/`isPaid` — então o
saldo permanece **idêntico**. É idempotente: rodar de novo termina em `0`/`0`.

## Pré-requisitos

- PIN `139` (usado no header `x-pin` das rotas admin).
- Acesso ao host de produção **ou** a uma máquina com acesso ao cluster Atlas
  (`cluster0.u8x8t.mongodb.net`).
- Os scripts leem as credenciais do cluster do **ambiente** (`DB_USER` e
  `DB_PASS` obrigatórios; `DB_CLUSTER` opcional). **Nenhuma senha fica
  hardcoded no repo** — exporte as variáveis no shell antes de rodar, ou use o
  Caminho A do Passo 4, que herda o `MONGO_CONN_MAP` real de produção.
- **Não extrair credenciais de `.env`** — use as variáveis de ambiente já
  exportadas (as mesmas do `MONGO_CONN_MAP`/`clone_db.sh`); `clone_db.sh` fica
  **intocado**.
- Backups/snapshots são opcionais (Passo 1), mas recomendados antes de gravar
  em produção.

---

## Passo 1 — Snapshot (opcional, somente leitura)

Seguindo o padrão do `infra/scripts/export_import.sh` (usa `MONGO_URI`):

```bash
mongoexport --uri="$MONGO_URI" --db=household_db --collection=transactions \
  --out=backup_household_db_transactions.json
mongoexport --uri="$MONGO_URI" --db=household_db --collection=categories \
  --out=backup_household_db_categories.json
```

> Apenas leitura. Garante rollback manual se algo der errado no Passo 4.

## Passo 2 — Dry-run (read-only)

Na máquina com acesso ao cluster (de `backend/`), com `DB_USER`/`DB_PASS`
exportados:

```bash
DB_USER=... DB_PASS=... node backend/scripts/migrate-categories.js household_db --dry-run
```

Revisar a saída:

- `categorias a atualizar` e `meios de pagamento a atualizar` — devem refletir
  os valores legados conhecidos.
- `Legados sem default (virariam categoria customizada)` — conjunto de strings
  que o `resolveCategory` criaria como **categoria customizada** no passo 4.
  **Decidir com o usuário**: deixar o `resolveCategory` criar a custom, ou
  pré-criar a categoria com as flags corretas antes de aplicar.

## Passo 3 — Deploy da nova versão

- Subir as imagens novas via `infra/docker/docker-compose.prod.yml`
  (backend e frontend).
- Validar o healthcheck:

```bash
curl -sS http://localhost:3001/api/health-check
# → { "status": "ok" }
```

> ⚠️ Enquanto a migração não rodar, a UI pode exibir categorias "undefined" e
> saldo quebrado. Isso é esperado e **temporário** até o Passo 4.

## Passo 4 — Aplicar

> Com aprovação explícita. **Nenhum** comando deste passo altera valores/datas
> de transação — só a representação de categoria/meio de pagamento.

**Caminho A (recomendado)** — usa a conexão real de produção (`MONGO_CONN_MAP`,
via PIN `139`):

```bash
curl -sS -H 'x-pin: 139' http://localhost:3001/api/admin/migrate-categories
```

**Caminho B** — script direto, sem `--dry-run`:

```bash
node backend/scripts/migrate-categories.js household_db
```

**Idempotência**: rodar o mesmo comando de novo deve retornar `0`/`0`.

## Passo 5 — Verificação

- `GET /api/categories` — respostas com `_id` (ObjectId), inclui "Cartão
  Alimentação", **sem** "undefined".
- `GET /api/transactions` (header `x-pin: 139`) — `category` e `paymentMethod`
  **populados** (objetos, não strings).
- Re-audit: `node backend/scripts/migrate-categories.js household_db --dry-run`
  → `0`/`0`.
- UI: saldo/relatórios corretos, categorias com nome.

## Passo 6 — Checklist de integridade (opcional)

O código novo filtra `status: 'active'`. Se existirem documentos legados sem o
campo `status`, ficam invisíveis na UI. **Auditar e corrigir com aprovação:**

```bash
# Conta documentos sem `status` (read-only)
node backend/scripts/audit-missing-status.js household_db

# Se houver, backfill (só adiciona o campo status; NÃO cria transações)
node backend/scripts/audit-missing-status.js household_db --apply
```

Equivalente via API (mesmo efeito, via conexão real de prod):

```bash
curl -sS -H 'x-pin: 139' http://localhost:3001/api/admin/migrate-status
```

**Órfãos F7** (scripts presentes na imagem — `COPY . .` no `Dockerfile.backend`).
No host de produção, o `MONGO_CONN_MAP` aponta para `household_db`:

```bash
# Auditoria (read-only)
docker exec -w /app/backend financial-app-backend node scripts/audit-orphan-goals.js

# Limpeza (SÓ com aprovação explícita — zera vínculos de meta quebrados)
docker exec -w /app/backend financial-app-backend node scripts/cleanup-orphan-goals.js --apply
```

---

## Restrições

- **NUNCA** rodar `GET /api/admin/migrate-contributions` (nem o equivalente
  script) — **cria transações** a partir de contribuições de meta.
- **NUNCA** alterar `amount`/`date`/`type`/`isPaid`/`description` de transações.
- **NUNCA** extrair credenciais de `.env`; `clone_db.sh` fica **intocado**.
- Gravação em produção (`--apply`, rotas admin, `migrate-status`) somente com
  aprovação explícita, um passo por vez, conferindo a saída de cada um.
- Qualquer dúvida no Passo 2 (conjunto de "legados sem default") → **parar** e
  decidir antes de aplicar.

## Scripts

| Script | Papel | Padrão de conexão |
|---|---|---|
| `migrate-categories.js` | string → ObjectId (dry-run/apply) | direta (env: DB_USER/DB_PASS) |
| `audit-missing-status.js` | conta/backfill de `status` ausente | direta (env: DB_USER/DB_PASS) |
| `audit-orphan-goals.js` | auditoria F7 (read-only) | via `MONGO_CONN_MAP` (PIN 139) |
| `cleanup-orphan-goals.js` | limpeza F7 (`--apply`) | via `MONGO_CONN_MAP` (PIN 139) |
