# Project State

## Decisions

| ID | Decision | Status | Rationale |
| -- | -------- | ------ | --------- |
| AD-001 | UI se comunica com o backend via Server Actions (Next.js), não via API REST própria. Regras de negócio vivem em `services/`, chamadas por Server Actions (e futuramente por Route Handlers, se necessário expor API pública). | active | App single-user na Vercel, sem consumidor externo hoje; menos boilerplate e menos duplicação de contrato/tipos entre cliente e servidor. Decidido no design de `moni-mvp`. |
| AD-002 | Toda mutação que altera `balance` de uma `Account` usa `mongoose.startSession().withTransaction(...)` envolvendo o `$inc` atômico do saldo e o write da(s) transação(ões), nunca uma escrita solta. | active | Garante que saldo e histórico de transações nunca fiquem inconsistentes entre si, mesmo sob falha parcial ou concorrência. Decidido no design de `moni-mvp`. |
| AD-003 | Valores monetários são sempre armazenados como inteiro em centavos (`number`), nunca `float`/decimal. | active | Evita erros de arredondamento de ponto flutuante em cálculos financeiros. Decidido no design de `moni-mvp`. |

## Handoff

- **Feature atual**: `moni-mvp`
- **Fases concluídas**: Specify (spec.md), Design (design.md), Tasks (tasks.md, **51 tasks / 9 fases / 6 batches** após revisão pós-Batch 4, `validate_tasks.py` limpo: 0 erros, warnings pré-existentes ok), Context UI (context.md), Execute Batch 1 (T1-T11, Foundation+Auth), Execute Batch 2 (T12-T21, Accounts+Categories), Execute Batch 3 (T22-T28, Transactions), Execute Batch 4 (T29-T36, Dashboard+Budget)
- **Revisão de spec/design/tasks pós-Batch 4 (esta run, sem código, sem commit)**: incorporadas novas decisões do usuário antes do Batch 5 rodar:
  - Cofrinho e investimento não são gasto: viram TRANSFER pra conta virtual (cofrinho = `SAVINGS` auto-criada por nome; Rico/XP detectado por Pix enviado com "RICO"/"XP" no campo origem/destino = conta fixa "Investimentos" tipo `INVESTMENT`) — `IMP-02` em spec.md
  - Novo tipo de conta `INVESTMENT` (aditivo) com aviso visual de saldo só-aportado — `ACC-03`
  - Auto-categorização deixou de ser um dicionário estático (`lib/import/category-keywords.ts` — **não criar**, ideia descartada) e virou aprendizado de "regra de comerciante" (`MerchantCategoryRule`: userId+merchantKey→categoryId), upsertada quando o usuário categoriza manualmente, aplicada automaticamente no import e sugerida na criação manual; nova tela `/merchants` categoriza em lote comerciantes sem regra (retroativo) e permite editar regras existentes (também retroativo, por consistência) — `CAT-02`
  - Filtro de mês/data exposto na UI de Transações (backend já suportava) — `TXN-04`
  - Mobile é requisito obrigatório retroativo em todas as telas já construídas, com nav mobile decidida como bottom navigation bar substituindo a lista horizontal do header — `UX-01`
  - `tasks.md` renumerado a partir de T37 (nada do Batch 5 havia sido implementado ainda, então renumerar foi seguro): Phase 8 agora tem 13 tasks (T37-T49: enum INVESTMENT+badge, OFX/CSV parsers, model/repo/service de `MerchantCategoryRule`, `import.service` com roteamento IMP-02 + sugestão CAT-02, Import Server Action/UI, wiring de categorização manual, Server Actions/UI de `/merchants`); nova **Phase 9 "Filtros e Mobile"** com 2 tasks (T50 filtro de mês, T51 auditoria mobile + bottom nav) vira o **Batch 6**
- **Próximo passo**: Execute Batch 5 (Phase 8 — Import OFX/CSV + Investimento/Cofrinho + Categorização por Comerciante, T37-T49); depois Execute Batch 6 (Phase 9 — Filtros e Mobile, T50-T51)
- **Branch**: main
- **Nada commitado ainda** (projeto greenfield; instrução do repositório proíbe commit automático — usuário commita manualmente após cada task).
- **Batch 4 (T29-T36) — detalhes**:
  - `services/dashboard.service.ts`: `getConsolidatedBalance` (soma `balance` de todas as contas) e `getMonthlySummaryByCategory` (agrega INCOME/EXPENSE pagas do mês por categoria, ignora TRANSFER e não pagas).
  - `services/budget.service.ts`: `setBudget` valida `categoryId` via `categoryRepository.findById(userId, categoryId)` antes de salvar (mesma correção de posse aplicada em `transaction.service`) e rejeita `limitCents <= 0`; `getMonthlyBudgetProgress` reaproveita `dashboardService.getMonthlySummaryByCategory` em vez de duplicar a agregação.
  - `app/(dashboard)/page.tsx` substituiu o boilerplate do `create-next-app` (antigo `app/page.tsx`, removido) — agora vive dentro do route group `(dashboard)`, herdando `Header`/nav automaticamente. Dashboard mostra saldo consolidado, donut chart (shadcn `chart` + `recharts`, já estavam instalados em `package.json` — v3.8.0/v1.48.0, nenhuma instalação nova necessária) com lista de categorias, e indicador de orçamento estourado (`components/dashboard/BudgetProgress.tsx`).
  - `app/(dashboard)/budgets/page.tsx` + `components/dashboard/budget-form.tsx`: sub-rota para definir limite por categoria.
  - Todas as Server Actions novas (`app/(dashboard)/actions.ts`, `app/(dashboard)/budgets/actions.ts`) passam o retorno por `toPlainObject` antes de `return { data }`, seguindo o padrão já estabelecido — sem reintrodução do bug de serialização.
  - Nenhum desvio do plano original; nenhuma dependência nova instalada (recharts/lucide-react já presentes).
