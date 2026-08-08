# 💰 Vibecodia Finances — Skills & Diretrizes de Desenvolvimento

Documento de referência para agentes de IA (Claude Code / OpenCode) que trabalham
neste repositório. Ele consolida a stack, os comandos, as regras de desenvolvimento
e os padrões do projeto.

> **Objetivo:** qualquer sessão de IA deve conseguir se localizar e seguir as
> convenções do projeto sem precisar reler todo o código.

---

## 1. Visão Geral do Projeto

Aplicativo web de **controle financeiro doméstico** (dashboard, transações,
calendário de vencimentos, relatórios, metas de economia, lista de compras).

- **Monorepo simples**: `frontend/` + `backend/` + `infra/` + `ia/`
- **Nome do pacote npm**: `financial-dashboard` (v0.114.0)
- **Branch principal**: `develop` (PRs de feature criam branches e abrem PR para `develop`)

## 2. Stack

| Camada | Tecnologia |
| ------ | ---------- |
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 |
| Backend | Node.js + Express 5 + Mongoose 8 (MongoDB) |
| Gráficos | Chart.js + react-chartjs-2 |
| PWA | vite-plugin-pwa |
| Push | web-push (notificações) |
| Upload | multer |
| Agendamento | node-cron |
| Infra | Docker Compose + Kubernetes (`infra/`) |

## 3. Estrutura de Diretórios

```
frontend/src/
├── components/     # Componentes React (TransactionForm, Dashboard, Reports, ...)
├── contexts/       # CategoriesContext, ThemeContext, VerificationContext
├── hooks/          # useCategories, useCurrencyInput, useFinancialData, ...
├── lib/            # utils.ts
├── utils/          # balanceCalculations, categoryUtils, helpers
└── types/

backend/
├── routes/         # transactions, categories, goals, notifications, admin, ...
├── services/       # categories, transactions, goals, notifications, sefaz
├── cron/           # jobs.js
├── config/         # configuração (env, DB)
├── db/             # conexão com MongoDB
├── middleware/
├── scripts/        # scripts utilitários
└── server.js       # entrada

infra/
├── docker/         # docker-compose (dev e prod)
├── k8s/            # manifests Kubernetes
└── scripts/

ia/
├── README.md       # Fluxo de desenvolvimento dirigido por IA
├── docs/
├── tasks/          # task-*.md (detalhamento das issues AI-driven)
└── templates/
```

## 4. Comandos Essenciais

| Comando | Ação |
| ------- | ---- |
| `npm run dev` | Sobe o frontend (Vite) — porta 5173 |
| `npm run build` | Type-check (`tsc -b frontend/config`) + build Vite |
| `npm run lint` | ESLint em todo o projeto |
| `npm run start` | Sobe o backend (`node backend/server.js`) |
| `npm run test-connection` | Testa a conexão com o MongoDB |
| `npm run preview` / `npm run serve` | Serve o `dist` (porta 5173) |
| `npm run release` | `release-it` (conventional changelog + versionamento) |

> ⚠️ **Validação obrigatória antes de considerar uma mudança pronta:**
> rodar `npm run lint` e `npm run build` e garantir que ambos passem.

## 5. Regras de Desenvolvimento

Extraídas das tasks AI-driven (`ia/tasks/*.md`) — aplicar **sempre**:

- Seguir os padrões de código, estrutura de arquivos e convenções de nomenclatura existentes.
- Frontend fica em `frontend/` (React, TypeScript, Vite, Tailwind CSS).
- Backend fica em `backend/` (Node.js, Express, MongoDB/Mongoose).
- **Não modificar arquivos não relacionados** à tarefa.
- **Não alterar** `package.json`, lockfiles ou arquivos de configuração a menos que explicitamente exigido.
- **Nunca** modificar autenticação, configuração de ambiente ou schema do banco a menos que explicitamente solicitado.
- Implementar mudanças **mínimas e seguras**.
- Não refatorar código não relacionado.
- Reutilizar componentes, hooks e utilitários já existentes (ex.: `lucide-react` para ícones).

## 6. Segurança (IMPORTANTE)

- 🔒 **Nunca** hardcodar senha/credenciais de banco em arquivos `.js`, `.md` ou qualquer arquivo versionado.
  Credenciais vêm **somente de variáveis de ambiente** (`.env`, não versionado).
- Não commitar `.env` nem segredos de terceiros.
- `settings.local.json` não deve conter dados sensíveis — apenas permissões.

## 7. Backend — Padrões

- Rotas em `backend/routes/`, lógica de negócio em `backend/services/`.
- Jobs agendados em `backend/cron/jobs.js`.
- Conexão com MongoDB gerenciada via `backend/connectionManager.js` / `backend/db/`.
- Configuração via `dotenv` (`backend/config/`).

### Verificação com banco de dados real
- O sandbox de desenvolvimento **não possui MongoDB** — validação live de API/UI
  (ex.: refactor de categorias) deve rodar **no ambiente do usuário**
  (`npm run start` + `npm run test-connection`).

## 8. Frontend — Padrões

- Componentes em `frontend/src/components/`, seguindo o design system existente (paleta Nordic, azuis/verdes suaves).
- Estado global via Context (`frontend/src/contexts/`), dados financeiros via hooks.
- Ícones do `lucide-react` (mantendo consistência com o projeto).
- Config do Vite/TS em `frontend/config/`.

## 9. Fluxo de Desenvolvimento Dirigido por IA

O projeto usa um fluxo automatizado de resolução de issues via IA
(documentado em `ia/README.md`):

- Issues com label `ai-driven` geram **task files** em `ia/tasks/task-<N>.md`.
- Cada task file descreve o escopo, regras e arquivos-alvo.
- Modos de operação: `ai-fast`, `ai-zen`, `ai-timeless` (via labels no GitHub).
- Stack do fluxo: OpenCode (modelo `big-pickle`) + RTK (token optimizer) + Aider.

**Ao trabalhar numa issue AI-driven, leia o task file correspondente** em
`ia/tasks/` antes de começar — ele é a fonte de verdade do escopo.

## 10. Ambientes / Infra

- **Dev**: `docker-compose up --build` → http://localhost:5173
- **Prod**: `docker-compose -f infra/docker/docker-compose.prod.yml up --build` → http://localhost:8080
- **Kubernetes**: manifests em `infra/k8s/`.

## 11. Skills Disponíveis (Claude Code)

Skills built-in do harness que se aplicam a este projeto:

| Skill | Uso |
| ----- | --- |
| `/code-review` | Revisar o diff de trabalho |
| `/review` | Revisar um PR do GitHub |
| `/security-review` | Revisão de segurança das mudanças pendentes |
| `/simplify` | Limpeza de código (reuso, simplificação, eficiência) |
| `dataviz` | Antes de criar qualquer gráfico/dashboard |
| `claude-api` | Quando o trabalho envolver Claude/Anthropic API |
| `/run` | Rodar/verificar a app no ambiente real |

---

*Primeira versão — manter atualizado conforme o projeto evolui.*
