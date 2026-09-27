# Moni MVP Specification

## Problem Statement

Romulo precisa de uma forma simples de registrar e categorizar entradas e saídas de dinheiro entre suas contas (conta corrente, cartão de crédito, dinheiro físico), com o mínimo de atrito possível, além de conseguir importar extratos bancários e acompanhar orçamentos por categoria. Hoje isso não existe de forma unificada; o objetivo é ter um app pessoal (single-user por enquanto) rodando na Vercel com MongoDB Atlas.

## Goals

- [ ] Registrar receitas, despesas e transferências entre contas com saldo sempre consistente
- [ ] Importar extratos OFX/CSV com deduplicação automática, reduzindo lançamento manual
- [ ] Visualizar saldo consolidado, resumo mensal por categoria e progresso de orçamento por categoria
- [ ] Rodar em produção na Vercel usando MongoDB Atlas, com autenticação via NextAuth.js

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Multi-usuário / compartilhamento de contas entre pessoas | Uso pessoal por enquanto; adicionar depois se necessário |
| Fatura de cartão de crédito com ciclo de fechamento/vencimento | Decidido explicitamente: cartão é tratado como conta simples no MVP |
| Login social (Google, etc.) | NextAuth suporta depois; MVP usa apenas email/senha |
| Notificações push/email de orçamento estourado | Alerta é apenas visual no dashboard neste MVP |
| App mobile nativo / PWA | Fora do MVP; web responsivo é suficiente por agora |
| Recorrência automática de transações (assinaturas recorrentes) | Não mencionado como prioridade; cada transação é lançada individualmente |
| Múltiplas moedas | Sistema assume uma única moeda (BRL), sem conversão |
| Categorização automática por ML/fuzzy matching | Fora de escopo; a auto-categorização existente (CAT-02) é aprendizado literal por `merchantKey` exato (substring normalizado), nunca correspondência aproximada/probabilística |
| Rastreamento do valor de mercado real de contas de investimento | Contas tipo `INVESTMENT` rastreiam apenas o valor aportado (transferido para elas); rendimento/desvalorização real de mercado não é calculado nem sincronizado automaticamente — atualização é manual, se o usuário quiser refletir isso ajustando a conta |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| ---------------------- | --------------- | --------- | ---------- |
| Stack fullstack | Next.js (App Router) monólito, TypeScript, MongoDB Atlas via Mongoose, deploy Vercel | Confirmado pelo usuário | y |
| Autenticação | NextAuth.js (Credentials Provider: email+senha, sessão JWT) | Confirmado pelo usuário | y |
| Dedup de importação | Detecta automaticamente por (accountId + date + amount + description normalizada) e pula, sem perguntar | Confirmado pelo usuário | y |
| Orçamento | Limite mensal fixo por categoria + alerta visual quando ultrapassado | Confirmado pelo usuário | y |
| Cartão de crédito | Tratado como conta tipo CREDIT simples, sem fatura/ciclo | Confirmado pelo usuário | y |
| Moeda | Apenas BRL, valores em centavos (inteiros) para evitar erro de ponto flutuante | Padrão de mercado para apps financeiros; evita bugs de arredondamento | y |
| Formato de importação | Suporta OFX (padrão bancário BR/US) e CSV (delimitador `,`, com cabeçalho configurável mapeando colunas para data/valor/descrição); parser de CSV deve suportar nativamente o formato de valor monetário brasileiro (`R$`, milhar `.`, decimal `,`, sinal `+`/`−` unicode) além do mapeamento de colunas genérico | OFX é o padrão de extratos bancários; CSV cobre bancos que só exportam planilha; formato brasileiro de moeda é o caso de uso real principal do usuário (ex: extrato PicPay) | y |
| Coluna `hora` em CSV de origem | Quando o CSV trouxer `data` e `hora` em colunas separadas (ex: PicPay), o parser descarta a `hora` e usa apenas a `data` (campo `Transaction.date` do modelo é `Date` sem componente de horário relevante ao domínio) | `Transaction.date` não modela horário; manter o parser simples, sem inventar granularidade não usada pelo resto do sistema | y |
| Transferência entre contas | Uma única transação tipo TRANSFER com `accountId` (origem) e `toAccountId` (destino); debita origem e credita destino atomicamente | Evita modelar como duas transações separadas e ter inconsistência | y |
| Regra de saldo | `balance` da conta é sempre derivado/atualizado a cada operação (criar/editar/excluir transação), nunca calculado on-the-fly a partir do histórico | Mais simples e rápido pro dashboard; toda mutação de transação recalcula saldo da(s) conta(s) afetada(s) | y |
| Transação "isPaid" | Transações despesa/receita podem ser marcadas como não pagas (previstas) e não afetam o saldo até `isPaid = true`; TRANSFER é sempre `isPaid = true` | Necessário pra suportar "gastos previstos" mencionados no modelo de dados original | y |
| Limites de input | Descrição até 200 caracteres; valor da transação entre R$0,01 e R$1.000.000,00; nome de conta/categoria até 60 caracteres | Limites razoáveis para uso pessoal, evita entradas absurdas | y |
| Rate limiting / abuso | N/A porque é single-user, sem exposição pública de cadastro (registro pode ficar restrito/manual se necessário) | Fora de escopo para uso pessoal | y |
| Concorrência | N/A porque é single-user (sem múltiplos usuários editando a mesma conta simultaneamente) | Fora de escopo dado o uso pessoal | y |
| Observabilidade | Logging básico de erros no servidor (console/Vercel logs); sem métricas/tracing dedicados | Suficiente para uso pessoal no MVP | y |
| Falha de dependência externa (MongoDB Atlas) | IF conexão com banco falhar THEN API SHALL retornar erro 503 com mensagem genérica, sem expor detalhes internos | Padrão de tratamento de erro de infra | y |
| Data lifecycle | Nenhuma expiração/arquivamento automático de transações no MVP; exclusão é manual e permanente (soft delete fora de escopo) | Simplicidade; usuário único controla seus próprios dados | y |
| Cofrinho = conta | Cada nome de cofrinho detectado no extrato (ex: "Cofrinho do Rô") vira sua própria conta tipo `SAVINGS`, criada automaticamente por nome (idempotente: reutiliza se já existir, comparando nome normalizado) na hora do import | Reaproveita o mecanismo de TRANSFER já modelado para contas do próprio usuário; cofrinho não é gasto | y |
| Investimento = conta com aviso | Novo valor aditivo `INVESTMENT` no enum `Account.type`; UI exibe aviso visual de que o saldo é apenas o valor aportado, podendo não refletir a valorização/desvalorização real de mercado | Decidido pelo usuário; sem integração com cotação externa (fora de escopo) | y |
| Regra de detecção Rico/XP | Durante o import, uma linha "Pix enviado" cujo campo origem/destino contenha (case-insensitive) "RICO" ou "XP" vira TRANSFER para uma conta fixa "Investimentos" (tipo `INVESTMENT`, auto-criada se não existir) | Caso de uso real do usuário (PicPay → corretora); investimento não é gasto | y |
| Auto-categorização por comerciante (revisão) | Substituída a ideia original de dicionário estático de palavras-chave por aprendizado a partir do próprio uso: quando o usuário categoriza manualmente uma transação, o sistema grava uma regra `merchantKey → categoryId` (por usuário); novas transações (import ou manuais) com o mesmo `merchantKey` reaproveitam essa regra (aplicada automaticamente no import, sugerida/pré-selecionada na criação manual); sem regra conhecida, fica sem categoria (fallback seguro, nunca advinha) | Decisão revisada em conversa com o usuário; mais útil que um dicionário fixo mantido manualmente, e continua sendo um match literal e seguro, não ML | y |
| Filtro de mês/data em Transações | UI de `/transactions` ganha seletor de mês/ano (ou intervalo de datas), reaproveitando o filtro de date range já suportado por `transactionRepository.list` | Necessário para controle mensal de gastos; backend já suporta, faltava expor na UI | y |
| Responsividade mobile | Requisito obrigatório (não apenas estético) em todas as telas já construídas e futuras; nav mobile do header vira bottom navigation bar em viewports estreitos (ver Tech Decision em `design.md`) | Uso principal do sistema é no celular | y |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Autenticação (cadastro e login) ⭐ MVP

**User Story**: Como usuário, quero me cadastrar e fazer login com email/senha para acessar meus dados financeiros com segurança.

**Why P1**: Sem autenticação não há como isolar/proteger os dados financeiros do usuário.

**Acceptance Criteria**:

1. WHEN o usuário se cadastra com email, senha e nome válidos THEN o sistema SHALL criar o usuário com senha hasheada (bcrypt) e SHALL nunca armazenar a senha em texto plano
2. IF o email informado no cadastro já existe THEN o sistema SHALL rejeitar com erro 409 e mensagem "email já cadastrado"
3. WHEN o usuário faz login com email e senha corretos THEN o sistema SHALL criar uma sessão autenticada (NextAuth JWT) válida
4. IF o usuário faz login com credenciais inválidas THEN o sistema SHALL retornar erro genérico "credenciais inválidas" sem indicar se o email existe
5. WHILE não houver sessão válida the sistema SHALL bloquear acesso a qualquer rota/API de dados financeiros, redirecionando para login
6. The sistema SHALL expirar a sessão após 30 dias de inatividade

**Independent Test**: Cadastrar um usuário novo, fazer logout, fazer login novamente e acessar o dashboard vazio.

---

### P1: Gestão de Contas ⭐ MVP

**User Story**: Como usuário, quero cadastrar minhas contas (conta corrente, cartão, dinheiro) para saber onde meu dinheiro está.

**Why P1**: Toda transação precisa estar vinculada a uma conta; é pré-requisito para o resto do MVP.

**Acceptance Criteria**:

1. WHEN o usuário cria uma conta com nome, tipo (CHECKING, CREDIT, SAVINGS, CASH) e saldo inicial THEN o sistema SHALL salvar a conta vinculada ao usuário autenticado
2. IF o nome da conta estiver vazio ou tiver mais de 60 caracteres THEN o sistema SHALL rejeitar com erro 400
3. WHEN o usuário edita nome ou tipo de uma conta THEN o sistema SHALL persistir a alteração sem alterar o saldo
4. IF o usuário tentar excluir uma conta que possui transações vinculadas THEN o sistema SHALL bloquear a exclusão com erro 409 e mensagem explicando o motivo
5. The sistema SHALL listar apenas contas pertencentes ao usuário autenticado (isolamento por `userId`)
6. The sistema SHALL armazenar `balance` em centavos (inteiro)

**Independent Test**: Criar 3 contas de tipos diferentes e ver todas listadas com saldo inicial correto.

---

### P1: Transações (receita, despesa, transferência) ⭐ MVP

**User Story**: Como usuário, quero registrar receitas, despesas e transferências para manter meu saldo sempre atualizado.

**Why P1**: É o núcleo do produto - sem isso não há gestão financeira.

**Acceptance Criteria**:

1. WHEN o usuário cria uma transação do tipo INCOME ou EXPENSE com `isPaid = true` THEN o sistema SHALL atualizar o `balance` da conta vinculada imediatamente (soma para INCOME, subtrai para EXPENSE)
2. WHEN o usuário cria uma transação com `isPaid = false` THEN o sistema SHALL salvar a transação sem alterar o `balance` de nenhuma conta
3. WHEN o usuário marca uma transação existente como paga (`isPaid` de false para true) THEN o sistema SHALL aplicar o efeito no saldo da conta naquele momento
4. WHEN o usuário cria uma transação do tipo TRANSFER com `accountId` (origem) e `toAccountId` (destino) THEN o sistema SHALL debitar o saldo da origem e creditar o saldo do destino atomicamente
5. IF `accountId` e `toAccountId` forem iguais em uma TRANSFER THEN o sistema SHALL rejeitar com erro 400
6. IF o valor da transação for menor ou igual a zero, ou maior que R$1.000.000,00 THEN o sistema SHALL rejeitar com erro 400
7. WHEN o usuário edita o valor, tipo ou conta de uma transação já paga THEN o sistema SHALL reverter o efeito anterior no(s) saldo(s) e aplicar o novo efeito, mantendo o saldo consistente
8. WHEN o usuário exclui uma transação paga THEN o sistema SHALL reverter seu efeito no(s) saldo(s) da(s) conta(s) envolvida(s)
9. The sistema SHALL exigir `categoryId` para transações INCOME e EXPENSE, e SHALL ignorar/rejeitar `categoryId` para TRANSFER
10. The sistema SHALL listar apenas transações pertencentes ao usuário autenticado, ordenadas por data decrescente por padrão
11. IF a descrição exceder 200 caracteres THEN o sistema SHALL rejeitar com erro 400

**Independent Test**: Criar uma conta com saldo zero, lançar uma receita de R$100 e uma despesa de R$30, e conferir que o saldo final é R$70.

---

### P1: Categorização ⭐ MVP

**User Story**: Como usuário, quero categorizar minhas transações (Alimentação, Lazer, Transporte etc.) para entender para onde vai meu dinheiro.

**Why P1**: Necessário para o dashboard/resumo mensal, que é um dos objetivos centrais do produto.

**Acceptance Criteria**:

1. WHEN o usuário cria uma categoria com nome, cor e ícone THEN o sistema SHALL salvá-la vinculada ao usuário autenticado
2. IF o nome da categoria exceder 60 caracteres ou já existir para o mesmo usuário THEN o sistema SHALL rejeitar com erro 400/409
3. IF o usuário tentar excluir uma categoria com transações vinculadas THEN o sistema SHALL bloquear a exclusão com erro 409
4. The sistema SHALL listar apenas categorias pertencentes ao usuário autenticado

**Independent Test**: Criar categoria "Alimentação", vincular a uma despesa, tentar excluir a categoria e ver o bloqueio.

---

### P1: Dashboard Simplificado ⭐ MVP

**User Story**: Como usuário, quero ver meu saldo consolidado e um resumo mensal de gastos por categoria para entender minha situação financeira rapidamente.

**Why P1**: É o objetivo final de visualização declarado no escopo original do MVP.

**Acceptance Criteria**:

1. WHEN o usuário acessa o dashboard THEN o sistema SHALL exibir a soma dos saldos de todas as contas do usuário (saldo consolidado)
2. WHEN o usuário acessa o dashboard THEN o sistema SHALL exibir o total de receitas e despesas pagas do mês corrente, agrupado por categoria
3. The sistema SHALL considerar apenas transações com `isPaid = true` no resumo mensal
4. IF não houver transações no mês corrente THEN o sistema SHALL exibir o resumo zerado, sem erro

**Independent Test**: Com transações já lançadas em 2 categorias diferentes no mês atual, o dashboard mostra os totais corretos por categoria e o saldo consolidado batendo com a soma manual das contas.

---

### P2: Orçamentos/Metas por Categoria

**User Story**: Como usuário, quero definir um limite mensal de gasto por categoria e ser alertado visualmente quando ultrapassar, para controlar melhor meus gastos.

**Why P2**: Não é essencial para registrar transações, mas agrega valor real ao acompanhamento financeiro; priorizado pelo usuário como próximo passo após o MVP básico.

**Acceptance Criteria**:

1. WHEN o usuário define um limite mensal (`budgetLimit`) para uma categoria THEN o sistema SHALL salvar esse valor vinculado à categoria e ao mês/ano de referência (ou como padrão recorrente mensal, se o usuário não especificar mês)
2. WHEN o gasto acumulado do mês numa categoria (transações EXPENSE pagas) ultrapassa o `budgetLimit` definido THEN o sistema SHALL sinalizar visualmente a categoria como "estourada" no dashboard
3. WHILE o gasto do mês estiver abaixo de 100% do limite the sistema SHALL exibir a porcentagem consumida (ex: "72% de R$500")
4. IF a categoria não tiver `budgetLimit` definido THEN o sistema SHALL exibir apenas o total gasto, sem indicador de progresso/estouro
5. IF o valor do `budgetLimit` for menor ou igual a zero THEN o sistema SHALL rejeitar com erro 400

**Independent Test**: Definir limite de R$500 em "Alimentação", lançar R$600 em despesas pagas na categoria no mês, e ver o indicador de estouro no dashboard.

---

### P2: Importação de Extrato (OFX/CSV)

**User Story**: Como usuário, quero importar um arquivo OFX ou CSV do meu banco para lançar transações automaticamente, sem digitar cada uma manualmente.

**Why P2**: Reduz atrito significativamente, mas o sistema já é utilizável sem isso (lançamento manual via P1); priorizado pelo usuário para logo após o MVP básico.

**Acceptance Criteria**:

1. WHEN o usuário faz upload de um arquivo `.ofx` válido para uma conta específica THEN o sistema SHALL extrair data, valor e descrição de cada transação e SHALL classificá-las como INCOME ou EXPENSE conforme o sinal do valor
2. WHEN o usuário faz upload de um arquivo `.csv` THEN o sistema SHALL permitir mapear as colunas do arquivo para (data, valor, descrição) antes de confirmar a importação
3. WHEN o sistema encontra uma transação já existente com a mesma `accountId` + data + valor + descrição normalizada (case-insensitive, espaços colapsados) THEN o sistema SHALL pular essa transação automaticamente, sem duplicar, e SHALL informar ao final quantas foram puladas
4. IF o arquivo enviado não for um OFX/CSV parseável THEN o sistema SHALL rejeitar com erro 400 e mensagem indicando o problema, sem lançar nenhuma transação
5. WHEN a importação é concluída THEN o sistema SHALL atualizar o `balance` da conta de destino somando o efeito líquido de todas as transações efetivamente importadas
6. The sistema SHALL importar transações sempre com `categoryId` vazio/"Sem categoria" (categorização automática é fora de escopo), deixando para o usuário categorizar depois
7. IF o arquivo exceder 5MB THEN o sistema SHALL rejeitar o upload com erro 400
8. WHEN o valor de uma coluna monetária de um CSV vier no formato brasileiro (prefixo `R$`, ponto como separador de milhar, vírgula como separador decimal, sinal `+` ASCII ou `−` — incluindo o caractere Unicode MINUS SIGN U+2212, não apenas o hífen ASCII U+002D) THEN o sistema SHALL normalizar esse valor para centavos (inteiro) corretamente, preservando o sinal para classificar INCOME (positivo) vs EXPENSE (negativo) — sem prejuízo do mapeamento de colunas genérico já previsto em AC2 para outros bancos/formatos que não usem esse padrão

**Independent Test**: Importar um CSV de exemplo com 10 linhas, sendo 2 duplicadas de transações já existentes, e confirmar que só 8 novas transações foram criadas e o saldo da conta reflete apenas essas 8.

---

### P2: Conta de Investimento (ACC-03)

**User Story**: Como usuário, quero uma conta do tipo "investimento" para representar dinheiro aportado em corretoras (Rico/XP), sabendo que o saldo mostrado é só o que eu aportei, não o valor de mercado atual.

**Why P2**: Depende de Contas (P1) já existir; é extensão aditiva do enum de tipo de conta, motivada pela necessidade de rotear Pix para corretora no import (IMP-02).

**Acceptance Criteria**:

1. WHEN o usuário cria ou edita uma conta com `type = INVESTMENT` THEN o sistema SHALL aceitar esse valor como um quinto tipo válido de conta (além de CHECKING, CREDIT, SAVINGS, CASH)
2. WHEN uma conta do tipo INVESTMENT é exibida em qualquer tela (lista de contas, seletor de conta, dashboard) THEN o sistema SHALL exibir um aviso visual (badge/texto) informando que o saldo reflete apenas o valor aportado e pode não refletir a valorização/desvalorização real de mercado
3. THE sistema SHALL mutar o `balance` de uma conta INVESTMENT da mesma forma que os demais tipos (via `$inc` atômico), sem qualquer integração com cotação externa de mercado

**Independent Test**: Criar uma conta tipo INVESTMENT, transferir R$100 para ela, e ver o aviso visual junto ao saldo de R$100 na lista de contas.

---

### P2: Roteamento de Cofrinho e Investimento no Import (IMP-02)

**User Story**: Como usuário, quero que "Dinheiro guardado"/"Dinheiro resgatado" de cofrinho e Pix para Rico/XP no extrato do PicPay virem transferências entre contas, não despesas, porque esse dinheiro continua sendo meu.

**Why P2**: Sem isso, o import de IMP-01 infla artificialmente o total de gastos com movimentações que não são consumo; depende de IMP-01 (parsing) e ACC-03 (tipo INVESTMENT) já existirem no design.

**Acceptance Criteria**:

1. WHEN uma linha de import contiver "Dinheiro guardado" seguido do nome de um cofrinho THEN o sistema SHALL criar (se ainda não existir, por nome normalizado) uma conta tipo SAVINGS com esse nome e SHALL lançar uma transação TRANSFER da conta de origem do import para essa conta, em vez de uma EXPENSE
2. WHEN uma linha de import contiver "Dinheiro resgatado" de um cofrinho THEN o sistema SHALL lançar uma transação TRANSFER da conta do cofrinho de volta para a conta de origem do import, em vez de uma INCOME
3. IF já existir uma conta do usuário com o mesmo nome normalizado (case-insensitive, trim, espaços colapsados) THEN o sistema SHALL reutilizá-la em vez de criar uma nova conta (idempotência dentro do mesmo import e entre imports)
4. WHEN uma linha for "Pix enviado" e o campo de origem/destino contiver, de forma case-insensitive, "RICO" ou "XP" THEN o sistema SHALL lançar uma transação TRANSFER da conta de origem para uma conta chamada "Investimentos" (tipo INVESTMENT, criada automaticamente se não existir), em vez de uma EXPENSE
5. THE sistema SHALL aplicar essa classificação (cofrinho/investimento) antes de qualquer tentativa de auto-categorização (CAT-02), já que transações TRANSFER nunca têm `categoryId`
6. IF uma linha de import não se enquadrar em nenhuma das regras acima THEN o sistema SHALL classificá-la normalmente como INCOME/EXPENSE (comportamento herdado de IMP-01)

**Independent Test**: Importar um CSV do PicPay com uma linha "Dinheiro guardado No cofrinho Viagem" e uma linha "Pix enviado" para "RICO LTDA", e verificar que ambas viram TRANSFER (para as contas "Viagem" e "Investimentos", respectivamente), sem aparecer no resumo de gastos do dashboard.

---

### P2: Aprendizado de Categorização por Comerciante (CAT-02)

**User Story**: Como usuário, quero que o sistema aprenda a categoria certa para os comerciantes que eu já categorizei antes, para não ter que categorizar a mesma loja/descrição toda vez que ela aparecer de novo (seja lançada na mão ou importada).

**Why P2**: Reduz atrito de categorização recorrente sem depender de um dicionário estático mantido manualmente; depende de Transações (P1), Categorização (P1) e Importação (IMP-01) já existirem.

**Acceptance Criteria**:

1. WHEN o usuário categoriza manualmente uma transação (na criação ou na edição, tipo EXPENSE ou INCOME) com uma `categoryId` THEN o sistema SHALL calcular um `merchantKey` normalizado a partir da descrição (mesma normalização usada no dedup de IMP-01: lowercase, trim, espaços colapsados) e SHALL salvar/atualizar (upsert) uma regra `merchantKey → categoryId` vinculada ao usuário
2. WHEN o sistema importa uma nova transação (EXPENSE/INCOME, após a classificação de IMP-02 já ter sido aplicada) sem categoria THEN o sistema SHALL consultar se existe uma regra conhecida para o `merchantKey` daquela transação e, se existir, SHALL aplicar automaticamente a `categoryId` da regra a essa transação importada
3. WHEN o usuário está criando manualmente uma nova transação cuja descrição já tem `merchantKey` com regra conhecida THEN o sistema SHALL pré-selecionar/sugerir essa categoria no formulário, permitindo que o usuário troque antes de salvar (nunca aplica à força sem o usuário ver)
4. IF não houver regra conhecida para o `merchantKey` de uma transação THEN o sistema SHALL deixar a transação sem categoria (fallback seguro herdado de IMP-01 AC6), nunca advinhando uma categoria incerta
5. THE sistema SHALL manter no máximo uma regra por (`userId`, `merchantKey`) — recategorizar manualmente um comerciante sobrescreve a regra anterior para ele
6. WHEN o usuário acessa uma tela de revisão de comerciantes (`/merchants`) THEN o sistema SHALL listar, em uma seção "Sem regra ainda", cada `merchantKey` distinto do usuário que aparece em transações sem `categoryId` e sem regra conhecida, com uma descrição-exemplo e a contagem de transações existentes que seriam afetadas
7. WHEN o usuário escolhe uma categoria para um `merchantKey` da seção "Sem regra ainda" THEN o sistema SHALL criar a regra `merchantKey → categoryId` e SHALL aplicar retroativamente essa `categoryId` a todas as transações existentes do usuário com aquele `merchantKey` que ainda estejam sem categoria, não apenas às futuras
8. WHEN o usuário acessa a seção "Regras existentes" da mesma tela THEN o sistema SHALL listar cada regra já criada com sua categoria atual, permitindo trocar a categoria
9. WHEN o usuário troca a categoria de uma regra existente THEN o sistema SHALL atualizar a regra e SHALL reaplicar em lote a nova `categoryId` a todas as transações existentes do usuário com aquele `merchantKey` (mesmo as que já tinham a categoria antiga), pela mesma razão de consistência regra↔histórico do AC7
10. THE sistema SHALL escopar toda listagem e atualização em lote de comerciantes/regras por `userId` (isolamento entre usuários), nunca afetando dados de outro usuário

**Independent Test**: Categorizar manualmente uma transação "UBER *TRIP" como "Transporte"; lançar/importar outra transação com a mesma descrição normalizada e ver que ela recebe (import) ou sugere (criação manual) automaticamente "Transporte". Separadamente: importar um extrato com 3 transações "IFOOD" sem categoria, ir em `/merchants`, categorizar "ifood" como "Alimentação" de uma vez, e ver as 3 transações antigas atualizadas retroativamente.

---

### P2: Filtro de Mês/Data em Transações (TXN-04)

**User Story**: Como usuário, quero filtrar a lista de transações por mês/ano para acompanhar meus gastos mês a mês.

**Why P2**: O backend (`transactionRepository.list`) já suporta filtro de date range (usado internamente pelo dashboard); falta só expor isso na UI de Transações.

**Acceptance Criteria**:

1. WHEN o usuário acessa `/transactions` THEN o sistema SHALL exibir um seletor de mês/ano (ou intervalo de datas) para filtrar a lista exibida
2. WHEN o usuário seleciona um mês/ano THEN o sistema SHALL reutilizar o filtro de date range já suportado por `transactionRepository.list` para retornar apenas as transações daquele período
3. IF nenhum filtro for selecionado THEN o sistema SHALL manter o comportamento atual (lista completa, ordenada por data decrescente)

**Independent Test**: Com transações em 2 meses diferentes, selecionar um mês na UI e ver que só as transações daquele mês aparecem.

---

### P1: Responsividade Mobile (UX-01)

**User Story**: Como usuário, quero usar o sistema no celular sem quebra de layout, já que uso o app principalmente no celular no dia a dia.

**Why P1**: Uso mobile é o cenário principal declarado pelo usuário; embora as telas já estejam construídas (Batches 1-4), este é um requisito retroativo obrigatório, não apenas estético.

**Acceptance Criteria**:

1. WHEN a largura do viewport for entre 375px e 414px THEN nenhuma página do sistema (Login, Cadastro, Contas, Categorias, Transações, Dashboard, Orçamento) SHALL exibir rolagem horizontal ou overflow de conteúdo
2. WHEN um formulário é exibido em viewport estreito (<480px) THEN seus campos SHALL empilhar verticalmente (layout de uma coluna)
3. THE sistema SHALL garantir área de toque mínima de aproximadamente 40px de altura/largura para botões e links interativos em viewport mobile
4. WHEN o viewport for menor que 768px THEN o header/nav (`components/layout/header.tsx`) SHALL usar bottom navigation bar em vez da lista horizontal de links (decisão registrada em `design.md`), mantendo o estilo minimalista já definido

**Independent Test**: Abrir cada tela já construída em viewport de 375px de largura e confirmar visualmente que não há overflow horizontal nem elementos cortados, e que o nav aparece como bottom navigation bar.

---

## Edge Cases

- IF o usuário não estiver autenticado e chamar qualquer API de dados THEN o sistema SHALL retornar 401
- IF o usuário tentar acessar/editar uma conta, categoria ou transação de outro usuário (por ID direto) THEN o sistema SHALL retornar 404 (não vazar existência do recurso)
- IF a conexão com o MongoDB Atlas falhar THEN a API SHALL retornar 503 com mensagem genérica, sem stack trace
- IF duas transações concorrentes tentarem alterar o saldo da mesma conta quase simultaneamente THEN o sistema SHALL usar operação atômica do MongoDB (`$inc` no `balance`) para evitar leitura-modificação-escrita inconsistente
- WHEN o usuário exclui uma conta sem transações THEN o sistema SHALL permitir a exclusão normalmente
- IF o valor de uma transação vier com mais de 2 casas decimais no input THEN o sistema SHALL arredondar para centavo antes de persistir

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Autenticação | Tasks (T5-T11) | Implementing |
| AUTH-02 | P1: Autenticação | Tasks (T7) | Implementing |
| ACC-01 | P1: Gestão de Contas | Tasks (T12-T16) | Implementing |
| ACC-02 | P1: Gestão de Contas | Tasks (T12-T16) | Implementing |
| TXN-01 | P1: Transações | Tasks (T22-T28) | Implementing |
| TXN-02 | P1: Transações | Design | Pending |
| TXN-03 | P1: Transações | Design | Pending |
| CAT-01 | P1: Categorização | Tasks (T17-T21) | Implementing |
| DASH-01 | P1: Dashboard Simplificado | Tasks (T29-T31) | Implementing |
| BUD-01 | P2: Orçamentos/Metas | Tasks (T32-T36) | Implementing |
| IMP-01 | P2: Importação de Extrato | Tasks (T38-T46) | Implementing |
| ACC-03 | P2: Conta de Investimento | Tasks (T37) | Implementing |
| IMP-02 | P2: Roteamento Cofrinho/Investimento | Tasks (T44) | Implementing |
| CAT-02 | P2: Aprendizado de Categorização por Comerciante | Tasks (T41-T44, T47-T49) | Implementing |
| TXN-04 | P2: Filtro de Mês/Data em Transações | Tasks (T50) | Implementing |
| UX-01 | P1: Responsividade Mobile | Tasks (T51) | Implementing |

**ID format:** `[CATEGORY]-[NUMBER]` (AUTH, ACC, TXN, CAT, DASH, BUD, IMP, UX)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 16 total, 14 mapped to tasks (AUTH-01, AUTH-02 — Phase 1+2 through T11; ACC-01, ACC-02 — Phase 3 through T16; TXN-01 — Phase 5 through T28; CAT-01 — Phase 4 through T21; DASH-01 — Phase 6 through T31; BUD-01 — Phase 7 through T36; ACC-03 — Phase 8 through T37; IMP-01 — Phase 8 through T38-T46; IMP-02 — Phase 8 through T44; CAT-02 — Phase 8 through T41-T44/T47-T49; TXN-04 — Phase 9 through T50; UX-01 — Phase 9 through T51), 2 unmapped (TXN-02, TXN-03 — not yet split out from TXN-01's implementation)

---

## Success Criteria

- [ ] Usuário consegue se cadastrar, logar e criar pelo menos uma conta, uma categoria e lançar uma transação em menos de 2 minutos
- [ ] Saldo consolidado no dashboard sempre bate com a soma manual dos saldos das contas, em qualquer sequência de criar/editar/excluir transações
- [ ] Importação de um extrato de exemplo não gera nenhuma transação duplicada
- [ ] Categoria com orçamento estourado é visualmente sinalizada no dashboard
- [ ] Sistema publicado na Vercel, conectado ao MongoDB Atlas, acessível publicamente apenas mediante login
