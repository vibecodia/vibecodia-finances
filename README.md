# 💰 Controle Financeiro

Aplicativo web moderno para gerenciamento financeiro doméstico.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Registro de Gastos e Receitas** com categorias personalizáveis
- **Sistema de Status de Pagamento** (pago/pendente) para despesas
- **Calendário de Vencimentos** com alertas para pagamentos pendentes
- **Dashboard Financeiro** com resumo mensal e comparativos
- **Relatórios Interativos** com gráficos de distribuição e evolução
- **Sistema de Metas de Economia** com acompanhamento de progresso
- **Armazenamento Local** com persistência de dados
- **Design Responsivo** otimizado para mobile

### 📱 Interface
- Design moderno com paleta Nordic (azuis e verdes suaves)
- Navegação por abas intuitiva
- Transições suaves e micro-interações
- Otimizado para uso em smartphones Android

## 🐳 Executando com Docker

### Desenvolvimento
```bash
# Clone o repositório
git clone <repository-url>
cd financial-app

# Execute com Docker Compose
docker-compose up --build

# Acesse em http://localhost:5173
Produção
bash# Build e execute a versão de produção
docker-compose -f infra/docker/docker-compose.prod.yml up --build

# Acesse em http://localhost:8080
📋 Comandos Úteis
bash# Parar os containers
docker-compose down

# Rebuild completo
docker-compose up --build --force-recreate

# Ver logs
docker-compose logs -f

# Executar comandos no container
docker-compose exec financial-app sh
🏗️ Estrutura do Projeto
financial-app/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Dashboard.tsx    # Resumo financeiro
│   │   ├── TransactionList.tsx # Lista de transações
│   │   ├── Calendar.tsx     # Calendário de vencimentos
│   │   ├── Reports.tsx      # Relatórios e gráficos
│   │   └── SavingsGoals.tsx # Metas de economia
│   ├── hooks/              # Custom hooks
│   ├── types/              # Definições TypeScript
│   └── utils/              # Funções utilitárias
├── infra/
│   └── docker/
│       ├── Dockerfile
│       ├── Dockerfile.prod
│       ├── docker-compose.yml
│       ├── docker-compose.prod.yml
│       └── .env            # Variáveis de ambiente
└── package.json
📁 Configuração de Diretórios
O projeto utiliza a seguinte estrutura para infraestrutura:

Docker: infra/docker/
Variáveis de Ambiente: infra/docker/.env

Para executar os comandos Docker, navegue até o diretório correto:
bashcd infra/docker
docker-compose up --build