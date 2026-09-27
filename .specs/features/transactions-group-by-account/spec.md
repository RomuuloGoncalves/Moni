# Transactions Group By Account Specification

## Problem Statement

O usuário relatou que a aba de transações exibe "uma transação para cada movimentação" (lista tradicional) e pediu para visualizar "um card de cada conta com o resultado total" das movimentações do mês (ex: 10 transferências do cofrinho viram apenas 1 card com o saldo dessas movimentações). Ele quer que isso seja selecionável e que fique como o padrão.

## Goals

- [ ] Permitir que o usuário visualize as transações do mês agrupadas por conta.
- [ ] Fornecer um toggle para o usuário escolher entre a "Lista de Transações" e "Agrupado por Conta".
- [ ] Definir a visualização "Agrupado por Conta" como o padrão inicial ao acessar a página.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature     | Reason         |
| ----------- | -------------- |
| Filtros complexos além do mês atual | A funcionalidade deve apenas se apoiar no filtro de mês já existente. |
| Gráficos de barra ou pizza | O pedido foca apenas em um card simples totalizador por conta. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default  | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Qual tela o usuário se referia? | Aba "Transações" | A aba "Contas" já exibe agrupado pelo saldo global, mas o usuário fala sobre "transações do mês". | y |
| Como calcular o resultado? | Receitas - Despesas | As transferências para a conta entram positivas, e as saindo entram negativas. | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Visualização Agrupada ⭐ MVP

**User Story**: As a usuário, I want visualizar as transações do mês agrupadas por conta so that eu veja o saldo líquido mensal de cada conta sem precisar somar transações individuais.

**Why P1**: Resolve diretamente o pedido principal do usuário de ver um card consolidado por conta.

**Acceptance Criteria**:

1. WHEN o usuário acessa a página de transações THEN the system SHALL carregar a visão "Agrupada por Conta" por padrão.
2. The system SHALL exibir um controle de abas/toggle para alternar entre "Lista" e "Por Conta".
3. WHILE a visão "Por Conta" está ativa, the system SHALL exibir um card para cada conta que tenha recebido ou enviado dinheiro no mês.
4. The system SHALL exibir no card o somatório de (receitas + transferências recebidas) - (despesas + transferências enviadas).

**Independent Test**: Can demo by accessing the transactions tab, seeing it defaults to the grouped view, and checking that the totals match the sum of transactions for that account.

---

## Edge Cases

- IF a conta não possui nenhuma transação no mês selecionado THEN the system SHALL omitir a conta da visualização agrupada, ou exibi-la com valor R$ 0,00 (vamos optar por omitir).
- IF há muitas contas com movimentação THEN the system SHALL exibi-las em uma lista com scroll normal (assim como as transações normais).

---

## Requirement Traceability

| Requirement ID | Story       | Phase  | Status  |
| -------------- | ----------- | ------ | ------- |
| TXN-01      | P1: Visualização Agrupada | Design | Pending |
| TXN-02      | P1: Visualização Agrupada | Design | Pending |
| TXN-03      | P1: Visualização Agrupada | Design | Pending |
| TXN-04      | P1: Visualização Agrupada | Design | Pending |

**Coverage:** 4 total, 0 mapped to tasks, 4 unmapped ⚠️

---

## Success Criteria

- [ ] A tela de transações inicia na visualização agrupada.
- [ ] O usuário consegue alternar entre a visão de lista e agrupada perfeitamente.
- [ ] Os valores totais por conta estão corretos em relação às transações individuais do mês.
