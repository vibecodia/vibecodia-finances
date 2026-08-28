Quero que você faça uma análise e implementação focada EXCLUSIVAMENTE no domínio de METAS e CONTRIBUIÇÕES deste projeto.

Repositório:
https://github.com/vibecodia/vibecodia-finances

Contexto:
O projeto possui o conceito de Savings Goals (Metas) e Contributions (Contribuições para essas metas).

Quero tornar essa parte do sistema muito mais clara, consistente e confiável, tanto na regra de negócio quanto na interface.

NÃO quero uma refatoração geral do projeto.
NÃO altere funcionalidades que não estejam relacionadas a Metas/Contribuições, exceto quando for estritamente necessário para corrigir uma dependência.

==================================================
1. PRIMEIRO: ANALISE O ESTADO ATUAL
==================================================

Antes de alterar código, faça uma análise completa de como atualmente funciona:

- criação de metas;
- edição de metas;
- exclusão/restauração de metas;
- criação de contribuições;
- edição de contribuições;
- exclusão/restauração de contribuições;
- relacionamento entre Transaction e SavingsGoal;
- cálculo do valor atual da meta;
- cálculo do progresso;
- tratamento de contribuições pagas/não pagas;
- impacto de uma contribuição no saldo da meta;
- impacto de editar uma transação/contribuição;
- impacto de excluir uma transação/contribuição;
- sincronização entre Transaction e SavingsGoal;
- como o frontend apresenta essas informações;
- quais regras estão no backend e quais estão no frontend.

Procure especialmente por lógica duplicada, regras contraditórias ou cálculos feitos em mais de um lugar.

Use o código real do repositório como fonte de verdade.
Não assuma como o sistema deveria funcionar apenas pelo nome das funções.

==================================================
2. DEFINA CLARAMENTE O DOMÍNIO
==================================================

Quero que você estabeleça uma definição clara para estes conceitos:

GOAL
Uma meta financeira representa um objetivo que possui:

- nome;
- valor alvo;
- valor atualmente acumulado;
- progresso;
- contribuições relacionadas.

CONTRIBUTION
Uma contribuição representa um aporte destinado a uma determinada meta.

Quero que fique extremamente claro no código:

Contribution != Goal
Contribution != Transaction

Se atualmente uma contribuição também gera uma Transaction, documente claramente essa relação.

A pergunta principal que precisamos responder é:

"Quando uma contribuição é criada, o que exatamente acontece com a meta e com a transação financeira?"

Defina isso explicitamente antes de implementar.

==================================================
3. DEFINA AS REGRAS DE NEGÓCIO
==================================================

Quero regras explícitas e centralizadas.

Exemplo conceitual:

Goal.targetAmount = valor que quero alcançar

Goal.currentAmount = soma das contribuições válidas

Goal.progress = currentAmount / targetAmount

Uma contribuição válida deve ter regras claras.

Analise e defina:

- contribuição pode ser maior que o valor restante da meta?
- contribuição pode ser negativa?
- contribuição com valor zero é permitida?
- contribuição pode ser marcada como não paga?
- contribuição não paga entra no currentAmount?
- excluir contribuição reduz currentAmount?
- restaurar contribuição aumenta currentAmount novamente?
- editar contribuição recalcula currentAmount?
- alterar status paid/unpaid recalcula currentAmount?
- excluir uma Transaction vinculada à contribuição afeta a meta?
- uma Transaction normal pode ser vinculada a uma Goal?
- uma contribuição precisa obrigatoriamente possuir Transaction?
- uma Transaction pode possuir mais de uma contribuição?
- uma contribuição pode existir sem Transaction?

Não invente respostas silenciosamente.

Primeiro compare essas perguntas com o comportamento atual do sistema e identifique inconsistências.

Depois proponha a regra mais coerente.

==================================================
4. SINGLE SOURCE OF TRUTH
==================================================

Quero evitar que o valor atual da meta fique sujeito a inconsistências.

Analise cuidadosamente se:

currentAmount

deve ser:

A) armazenado diretamente no banco;

ou

B) calculado a partir das Contributions;

ou

C) armazenado + recalculado periodicamente.

Escolha a abordagem mais segura para o projeto atual.

Minha preferência é evitar múltiplas fontes de verdade.

Se currentAmount for derivado das contribuições, considere implementar uma função centralizada, por exemplo:

calculateGoalCurrentAmount(goalId)

ou equivalente arquiteturalmente adequado.

Essa função deve ser a referência para todos os pontos que precisam saber quanto uma meta possui acumulado.

==================================================
5. TRANSAÇÕES E ATOMICIDADE
==================================================

Como estamos lidando com dinheiro, analise cuidadosamente operações que alteram simultaneamente:

- Transaction
- Contribution
- SavingsGoal

Evite situações como:

1. cria contribuição;
2. atualiza meta;
3. salva meta;
4. tenta criar transaction;
5. transaction falha;
6. meta fica inconsistente.

Se o MongoDB/arquitetura atual permitir, considere MongoDB Sessions/Transactions.

Caso não seja adequado para a arquitetura atual, implemente uma estratégia segura de consistência e explique a decisão.

Não faça uma solução complexa apenas por arquitetura.

Priorize consistência real.

==================================================
6. BACKEND
==================================================

Analise e melhore os services/routes relacionados a:

- SavingsGoal
- Contribution
- Transaction

Quero:

- validação consistente;
- regras de negócio centralizadas;
- tratamento de erros;
- evitar lógica duplicada;
- evitar cálculos diferentes para a mesma informação;
- evitar efeitos colaterais escondidos;
- nomes claros;
- funções pequenas quando fizer sentido.

Não faça abstrações excessivas.

Prefiro código simples e explícito.

==================================================
7. FRONTEND / UX
==================================================

Esta parte é MUITO importante.

Quero que você analise se atualmente está claro para o usuário:

"Quanto eu tenho na meta?"

"Quanto falta?"

"Quanto eu já contribuí?"

"Quais contribuições foram feitas?"

"Quais estão pendentes?"

"Qual contribuição está relacionada a qual transação?"

"Se eu fizer uma contribuição, o que acontece?"

A interface deve deixar isso intuitivo.

Sugestão conceitual:

META

Viagem para Europa
R$ 10.000,00

R$ 4.500,00 acumulados

████████░░░░░░░░ 45%

Faltam R$ 5.500,00


CONTRIBUIÇÕES

25/08    R$ 1.000,00    Pago
20/08    R$   500,00    Pago
10/08    R$   300,00    Pendente


[ + Adicionar contribuição ]

Quero que você adapte essa ideia ao design atual do projeto, sem simplesmente copiar esse layout.

O objetivo é clareza.

==================================================
8. UX DA CONTRIBUIÇÃO
==================================================

Ao criar uma contribuição, o usuário precisa entender:

"Estou adicionando dinheiro a esta meta."

A interface deve mostrar claramente:

- Meta selecionada;
- valor da contribuição;
- data;
- status;
- descrição, se aplicável;
- impacto no progresso da meta.

Se a contribuição também gerar uma Transaction, isso deve ficar claro para o usuário.

Evite termos ambíguos.

Por exemplo, não quero que o usuário fique pensando:

"Eu criei uma contribuição ou uma despesa?"

Defina uma linguagem consistente.

==================================================
9. EDGE CASES
==================================================

Teste e corrija pelo menos estes cenários:

1. Criar contribuição normal.

2. Criar contribuição igual ao valor restante.

3. Criar contribuição maior que o restante.

4. Criar contribuição com valor zero.

5. Criar contribuição negativa.

6. Editar valor da contribuição.

7. Alterar contribuição de paid para unpaid.

8. Alterar contribuição de unpaid para paid.

9. Excluir contribuição.

10. Restaurar contribuição.

11. Excluir transaction relacionada.

12. Restaurar transaction relacionada.

13. Excluir goal com contributions.

14. Meta sem nenhuma contribuição.

15. Meta 100% concluída.

16. Meta acima de 100%.

17. Duas contribuições simultâneas.

18. Erro durante criação da contribution + transaction.

19. Refresh da página depois de criar contribuição.

20. Reabrir a meta posteriormente e verificar se os valores continuam consistentes.

==================================================
10. TESTES
==================================================

Antes de considerar concluído, crie ou atualize testes para as regras críticas.

Principalmente:

- cálculo do currentAmount;
- cálculo do progresso;
- criação de contribution;
- atualização;
- exclusão;
- restauração;
- paid/unpaid;
- sincronização com Transaction;
- consistência após operações concorrentes ou falhas.

Não crie testes artificiais apenas para aumentar cobertura.

Os testes devem proteger as regras de negócio.

==================================================
11. DOCUMENTAÇÃO
==================================================

Depois da implementação, documente brevemente:

- o que é uma Goal;
- o que é uma Contribution;
- o que é uma Transaction;
- relação entre elas;
- como currentAmount é calculado;
- quando uma contribution impacta a meta;
- o que acontece quando uma contribution é editada/excluída/restaurada.

Pode criar ou atualizar documentação dentro do projeto se fizer sentido.

==================================================
12. FORMA DE EXECUÇÃO
==================================================

IMPORTANTE:

Não saia alterando arquivos imediatamente.

Faça primeiro:

1. mapear a implementação atual;
2. identificar as regras existentes;
3. listar inconsistências;
4. propor a regra de negócio desejada;
5. definir o plano de alteração.

Depois execute a implementação.

Durante a implementação:

- preserve funcionalidades existentes;
- evite breaking changes desnecessários;
- não faça refatorações fora do domínio;
- mantenha compatibilidade quando possível;
- não duplique regras;
- não introduza abstrações desnecessárias.

Ao final execute:

- lint;
- testes;
- build;
- e qualquer validação relevante existente no projeto.

==================================================
13. RESULTADO FINAL
==================================================

No final, quero um relatório contendo:

### O que estava errado

Lista objetiva dos problemas encontrados.

### O que foi alterado

Arquivos e mudanças realizadas.

### Regras de negócio finais

Explique claramente como Goals, Contributions e Transactions funcionam agora.

### Fluxo final

Exemplo:

User
 ↓
Create Contribution
 ↓
Contribution
 ↓
Transaction
 ↓
Goal recalculation
 ↓
Updated progress

ou o fluxo que realmente for implementado.

### Testes

Quais cenários foram cobertos.

### Pendências

O que ainda poderia ser melhorado futuramente, mas que NÃO deve bloquear esta implementação.

IMPORTANTE:

O objetivo principal desta tarefa é:

"Fazer com que o conceito de CONTRIBUIÇÃO PARA UMA META seja tecnicamente consistente e extremamente claro para o usuário."

Priorize CORREÇÃO + CLAREZA + CONSISTÊNCIA sobre quantidade de código ou quantidade de features.