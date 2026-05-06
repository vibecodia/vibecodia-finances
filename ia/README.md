# Fluxo de Desenvolvimento Dirigido por IA (AI-Driven)

Este workflow automatiza a resolução de Issues no GitHub usando a API do **OpenCode (Zen)** com o modelo **big-pickle** e a ferramenta Aider.

## Fluxo de Execução

```mermaid
graph TD
    A[Issue com label 'ai-driven'] --> B[Criar Branch e Task File]
    B --> C{Modo de Operação?}
    
    C -- Standard (Padrão) --> D[AI Planner: OpenCode big-pickle]
    C -- Fast (ai-fast) --> E[Pular Planejamento]
    C -- Zen (ai-zen) --> E
    
    D --> F[Aider: OpenCode big-pickle]
    E --> F
    
    F --> G[Instalação e Validação]
    G --> H{Build OK?}
    
    H -- Sim --> I[Commit e Push]
    H -- Não --> J[Bloquear e Notificar]
    
    I --> K[Criar Pull Request]
    K --> L[Comentário na Issue]
```

## Modos de Operação

- **Standard**: Usa o endpoint do OpenCode com o modelo `big-pickle` para criar um plano de implementação detalhado antes das mudanças.
- **Fast (`ai-fast`)**: Pula etapa de planejamento para rapidez. Timeout curto (2 min).
- **Zen (`ai-zen`)**: Pula planejamento. Timeout longo (20 min) para tarefas complexas.

## Componentes Principais

- **Aider**: Configurado para usar o provider compatível da OpenAI via prefixo `openai/big-pickle` e base em `https://opencode.ai/zen/v1`.
- **Modelos**: 
  - `openai/big-pickle`: Modelo usado no Aider (prefixo necessário para compatibilidade).
  - `big-pickle`: Modelo usado no Planner via curl.
- **Segredos**: Requer `OPENCODE_API_KEY` configurado nos Secrets do repositório.
- **Validação**: Executa `npm install`, `lint` e `build` antes de permitir o push.
