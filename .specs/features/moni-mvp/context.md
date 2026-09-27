# Moni MVP — Context (UI/Visual Decisions)

Captured during Tasks approval, before Execute. These decisions constrain the design/tasks UI work (T16, T21, T28, T31, T36, T42).

| Decision | Choice | Notes |
| -------- | ------ | ----- |
| Visual style | Minimalista/clean, referência Nubank/Linear | Bastante espaço em branco, tipografia forte, números grandes e legíveis, poucas cores de destaque (uma cor de marca + neutros) |
| Tema | Claro por padrão | Não foi pedido dark-mode-first; pode ser adicionado depois como extensão aditiva |
| Componentes | shadcn/ui + Tailwind CSS | Componentes acessíveis (button, form, dialog, table) sobre Radix + Tailwind; customizáveis para o estilo minimalista escolhido |
| Gráfico do resumo mensal | Donut/pizza por categoria + lista ao lado | Biblioteca: `recharts` (a que o shadcn/ui `chart` component usa) — confirmar versão via Context7 na task correspondente antes de instalar |
| Referência visual adicional | Nenhuma além de Nubank/Linear | N/A |
| Ícones | `lucide-react` | Já vem como dependência padrão do shadcn/ui (confirmado em `package.json`, v1.48.0), nenhuma lib nova necessária. `Category.iconType` armazena o nome do ícone lucide (ex: `"utensils"`, `"car"`, `"film"`); um seletor de ícone na UI de Categorias (T21) lista um subconjunto curado de ícones lucide. Usado também para indicar visualmente o tipo de transação (seta para cima/baixo/transferência) nas listas e no dashboard |

**Impacto nas tasks já aprovadas na estrutura (validate_tasks limpo):**
- T1 (scaffold) passa a incluir instalação/configuração do Tailwind CSS + shadcn/ui (`npx shadcn init` equivalente) — mesmo arquivo/escopo já coberto por T1, sem necessidade de nova task.
- T31 (Dashboard UI) passa a incluir a dependência `recharts` (via shadcn `chart`) para o donut de categorias.
- Todas as tasks de UI (T16, T21, T28, T31, T36, T46, T49) seguem o estilo minimalista definido acima ao construir os componentes.

Nenhuma mudança na estrutura de fases/dependências/testes já validada — estas são decisões de estilo aplicadas dentro do escopo de cada task de UI existente.

---

## Adendo (decisões pós-Batch 4, antes do Batch 5)

| Decisão | Escolha | Notas |
| ------- | ------- | ----- |
| Mobile é requisito obrigatório | Não é só "estilo minimalista" — é um requisito funcional retroativo (UX-01), com task própria de auditoria (T51) sobre TODAS as telas já construídas nos Batches 1-4, não só telas futuras | Uso principal do sistema é no celular, confirmado pelo usuário |
| Navegação mobile do header | Bottom navigation bar fixa (ícone + label) para viewport <768px, substituindo a lista horizontal de links atual de `components/layout/header.tsx`; mantém a nav horizontal (ou um header fino só com logo) em telas ≥768px | Padrão mobile-first de apps financeiros (Nubank/Inter); mantém itens de nav a um toque, sem esconder atrás de hambúrguer; coerente com o estilo minimalista já adotado (poucos itens: Resumo, Transações, Contas, Categorias) — registrado como Tech Decision em `design.md` |
| Cofrinho/Investimento não é gasto | TRANSFER entre a conta de origem e uma conta virtual (cofrinho = `SAVINGS` auto-criada por nome; Rico/XP = `INVESTMENT` fixa "Investimentos") — nunca EXPENSE | Reaproveita o mecanismo de TRANSFER já existente; ver IMP-02/ACC-03 em `spec.md` e design correspondente |
| Categorização por comerciante aprendida (substitui dicionário estático) | `MerchantCategoryRule` (userId + merchantKey → categoryId), criada/atualizada quando o usuário categoriza manualmente; aplicada automaticamente no import e sugerida na criação manual; tela `/merchants` permite categorizar em lote comerciantes sem regra (retroativo) e editar regras existentes (também retroativo) | Ver CAT-02 em `spec.md`; decisão revisada em conversa — não é mais um dicionário de palavras-chave fixo mantido manualmente |
