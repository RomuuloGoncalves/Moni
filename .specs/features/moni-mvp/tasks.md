# Moni MVP Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/moni-mvp/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from spec + design; no pre-existing repo/tests to sample (greenfield project). Guidelines found: none — user confirmed test scope directly: **unit tests (services) + integration tests (Server Actions/repositories, via `mongodb-memory-server`)**. No e2e in this MVP. Stack: Next.js (App Router) + TypeScript + Vitest.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | --------------------- | ------------------ | ------------- |
| Service (`services/*.service.ts`) | unit | All branches; 1:1 to spec ACs; every listed edge case for that story | `services/**/*.test.ts` | `npm run test:unit` |
| Parser (`lib/parsers/*.ts`) | unit | Happy path + malformed-input edge cases (IMP-01 AC4) | `lib/parsers/**/*.test.ts` | `npm run test:unit` |
| Repository (`repositories/*.repository.ts`) | integration | Key query paths (create/find/dependent-check) + error handling, against `mongodb-memory-server` | `repositories/**/*.integration.test.ts` | `npm run test:integration` |
| Server Action (`app/**/actions.ts`) | integration | Every action: happy path + auth-boundary (401/404) + validation error path | `app/**/*.integration.test.ts` | `npm run test:integration` |
| NextAuth config (`lib/auth/options.ts`) | integration | `authorize()` happy + invalid-credentials path | `lib/auth/*.integration.test.ts` | `npm run test:integration` |
| Mongoose model/schema | none | Build gate only | - | build gate only |
| UI page/component (`app/**/page.tsx`, `components/**`) | none | Build gate only (no e2e in this MVP scope) | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run test:unit` |
| Full | After tasks with integration tests | `npm run test:unit && npm run test:integration` |
| Build | After phase completion or model/UI-only tasks | `npm run build && npm run lint && npm run test:unit && npm run test:integration` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation
```
T1 → T2
T2 → T3
T2 → T4
```

### Phase 2: Auth
```
T2 → T5
T5 → T6
T6 → T7
T7 → T8
T8 → T9
T8 → T10
T8 → T11
```

### Phase 3: Accounts
```
T2 → T12
T12 → T13
T13 → T14
T14 → T15
T15 → T16
```

### Phase 4: Categories
```
T2 → T17
T17 → T18
T18 → T19
T19 → T20
T20 → T21
```

### Phase 5: Transactions
```
T2 → T22
T22 → T23
T23 → T24
T14 → T24
T24 → T25
T25 → T26
T26 → T27
T27 → T28
```

### Phase 6: Dashboard
```
T14 → T29
T26 → T29
T29 → T30
T30 → T31
```

### Phase 7: Budget
```
T2 → T32
T32 → T33
T33 → T34
T29 → T34
T34 → T35
T35 → T36
T31 → T36
```

### Phase 8: Import OFX/CSV + Investimento/Cofrinho + Categorização por Comerciante
```
T16 → T37
T22 → T38
T38 → T39
T22 → T40
T17 → T41
T41 → T42
T23 → T42
T42 → T43
T39 → T44
T40 → T44
T23 → T44
T14 → T44
T37 → T44
T43 → T44
T44 → T45
T45 → T46
T43 → T47
T27 → T47
T28 → T47
T43 → T48
T48 → T49
```

### Phase 9: Filtros e Mobile
```
T27 → T50
T28 → T50
T9 → T51
T10 → T51
T16 → T51
T21 → T51
T50 → T51
T31 → T51
T36 → T51
T46 → T51
T49 → T51
```

---

## Task Breakdown

### T1: Initialize Next.js project (TypeScript, App Router, ESLint, Tailwind + shadcn/ui)

**What**: Scaffold the Next.js app (`create-next-app` equivalent config) with TypeScript, App Router, ESLint, Tailwind CSS, and shadcn/ui initialized (base theme configured for a minimalist style — generous whitespace, strong type scale, single accent color, light theme by default per `context.md`); project `package.json` scripts (`dev`, `build`, `lint`, `test:unit`, `test:integration`).
**Where**: repo root (`package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.eslintrc*`, `tailwind.config.ts`, `components.json`, `components/ui/*` from shadcn init)
**Depends on**: None
**Reuses**: n/a (greenfield)
**Requirement**: n/a (foundation)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npm run dev` starts without error
- [x] `npm run build` succeeds
- [x] `npm run lint` runs and passes on the scaffold

**Tests**: none
**Gate**: build

---

### T2: MongoDB connection helper

**What**: Implement `lib/db/connect.ts` — cached Mongoose connection (global cache pattern for serverless), reading `MONGODB_URI` from env.
**Where**: `lib/db/connect.ts`
**Depends on**: T1
**Reuses**: n/a
**Requirement**: n/a (foundation)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `connectDB()` reuses cached connection across calls (verified with a simple script or test)
- [x] Throws a clear error if `MONGODB_URI` is missing

**Tests**: none
**Gate**: build

---

### T3: Vitest + mongodb-memory-server test harness

**What**: Configure `vitest.config.ts`, a test setup file that starts/stops `mongodb-memory-server` for integration tests, and `npm run test:unit` / `npm run test:integration` scripts (separate configs or `--project` split by path pattern).
**Where**: `vitest.config.ts`, `vitest.setup.ts`, `package.json` (scripts)
**Depends on**: T2
**Reuses**: `lib/db/connect.ts`
**Requirement**: n/a (foundation)

**Tools**:
- MCP: `context7` (verify current `mongodb-memory-server` + Vitest setup API before wiring — Knowledge Verification Chain Step 3)
- Skill: NONE

**Done when**:
- [x] `npm run test:unit` runs (0 tests, exits 0) on empty `services/**/*.test.ts` glob
- [x] `npm run test:integration` boots an in-memory Mongo instance and tears it down cleanly in a throwaway smoke test

**Tests**: none
**Gate**: build

---

### T4: Environment variable template

**What**: Create `.env.example` documenting `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
**Where**: `.env.example`
**Depends on**: T2
**Reuses**: n/a
**Requirement**: n/a (foundation)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `.env.example` lists all required vars with a one-line comment each
- [x] README references it for local setup

**Tests**: none
**Gate**: build

---

### T5: User Mongoose model

**What**: Define `User` schema (`name`, `email` unique index, `passwordHash`, `createdAt`).
**Where**: `models/User.ts`
**Depends on**: T2
**Reuses**: n/a
**Requirement**: AUTH-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Schema matches design's `User` interface
- [x] Unique index on `email` declared

**Tests**: none
**Gate**: build

---

### T6: UserRepository

**What**: Implement `create(input)`, `findByEmail(email)`.
**Where**: `repositories/user.repository.ts`
**Depends on**: T5
**Reuses**: `lib/db/connect.ts`
**Requirement**: AUTH-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] `create` persists and `findByEmail` retrieves the same doc (integration test against in-memory Mongo)
- [x] Duplicate email insert raises the Mongo unique-index error, surfaced as a typed error

**Tests**: integration
**Gate**: full

---

### T7: user.service (register)

**What**: `registerUser(input)` — hashes password with bcrypt, calls repository, throws `DuplicateEmailError` on conflict.
**Where**: `services/user.service.ts`
**Depends on**: T6
**Reuses**: `UserRepository`
**Requirement**: AUTH-01, AUTH-02

**Tools**: MCP: `context7` (confirm current `bcrypt`/`bcryptjs` API) / Skill: NONE

**Done when**:
- [x] AUTH-01 AC1 (hash on register, never plaintext) covered
- [x] AUTH-01 AC2 (duplicate email → `DuplicateEmailError`) covered

**Tests**: unit
**Gate**: quick

---

### T8: NextAuth configuration

**What**: `authOptions` with Credentials provider calling `user.service` to verify email/password (bcrypt compare), JWT session strategy, 30-day session expiry (AUTH-01 AC6).
**Where**: `lib/auth/options.ts`
**Depends on**: T7
**Reuses**: `user.service`
**Requirement**: AUTH-01

**Tools**: MCP: `context7` (verify current NextAuth.js / Auth.js Credentials provider API for the installed version) / Skill: NONE

**Done when**:
- [x] AUTH-01 AC3 (valid login → session) covered
- [x] AUTH-01 AC4 (invalid credentials → generic error, no email-existence leak) covered
- [x] Session `maxAge` set to 30 days per AC6

**Tests**: integration
**Gate**: full

---

### T9: Register Server Action + page

**What**: `registerAction(formData)` calling `user.service.registerUser`, plus `app/(auth)/register/page.tsx` form UI.
**Where**: `app/(auth)/register/actions.ts`, `app/(auth)/register/page.tsx`
**Depends on**: T8
**Reuses**: `user.service`
**Requirement**: AUTH-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Successful registration redirects to login
- [x] Duplicate-email submission shows the "email já cadastrado" message (integration test on the action)

**Tests**: integration
**Gate**: full

---

### T10: Login page

**What**: `app/(auth)/login/page.tsx` using NextAuth's `signIn` (Credentials), showing generic error on failure.
**Where**: `app/(auth)/login/page.tsx`
**Depends on**: T8
**Reuses**: `authOptions`
**Requirement**: AUTH-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Valid login redirects to dashboard
- [x] Invalid login shows generic error, stays on page

**Tests**: none
**Gate**: build

---

### T11: Route protection middleware

**What**: `middleware.ts` blocking unauthenticated access to all routes except `/login`, `/register`, static assets (AUTH-01 AC5).
**Where**: `middleware.ts`
**Depends on**: T8
**Reuses**: NextAuth session/JWT
**Requirement**: AUTH-01

**Tools**: MCP: `context7` (confirm current NextAuth middleware pattern for the installed version) / Skill: NONE

**Done when**:
- [x] Unauthenticated request to `/dashboard` (or any protected route) redirects to `/login`
- [x] Authenticated request passes through

**Tests**: integration
**Gate**: full

---

### T12: Account Mongoose model

**What**: Define `Account` schema (`userId` indexed, `name` ≤60 chars, `type` enum, `balance` integer cents).
**Where**: `models/Account.ts`
**Depends on**: T2
**Reuses**: n/a
**Requirement**: ACC-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Schema matches design; `userId` index declared; `type` restricted to the 4 enum values

**Tests**: none
**Gate**: build

---

### T13: AccountRepository

**What**: `create`, `findById(userId, id)` (scoped to `userId`), `list(userId)`, `update(userId, id, input)`, `delete(userId, id)`, `adjustBalance(id, deltaCents, session?)` using `$inc`.
**Where**: `repositories/account.repository.ts`
**Depends on**: T12
**Reuses**: `lib/db/connect.ts`
**Requirement**: ACC-01, ACC-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] All CRUD paths covered against in-memory Mongo
- [x] Queries scoped by `userId` (a different user's id returns not-found)
- [x] `adjustBalance` uses atomic `$inc` (verified via concurrent-increment test)

**Tests**: integration
**Gate**: full

---

### T14: account.service

**What**: `createAccount`, `updateAccount` (never touches `balance`), `deleteAccount` (blocks if `TransactionRepository.existsFor(accountId)`), `adjustBalance` pass-through with `ClientSession` support.
**Where**: `services/account.service.ts`
**Depends on**: T13
**Reuses**: `AccountRepository`
**Requirement**: ACC-01, ACC-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] ACC-01 AC2 (name validation) covered
- [x] ACC-01 AC3 (edit doesn't change balance) covered
- [x] ACC-01 AC4 (delete blocked when dependent transactions exist) covered
- [x] ACC-01 AC5 (isolation by userId) covered

**Tests**: unit
**Gate**: quick

---

### T15: Account Server Actions

**What**: `createAccountAction`, `updateAccountAction`, `deleteAccountAction`, `listAccountsAction` — each reads `userId` from session, calls `account.service`.
**Where**: `app/(dashboard)/accounts/actions.ts`
**Depends on**: T14
**Reuses**: `account.service`, NextAuth session
**Requirement**: ACC-01, ACC-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Unauthenticated call → rejected (401-equivalent)
- [x] Happy path create/update/delete/list covered end-to-end against in-memory Mongo

**Tests**: integration
**Gate**: full

---

### T16: Accounts UI

**What**: `app/(dashboard)/accounts/page.tsx` — list accounts with balance, create/edit form, delete with confirmation (surfacing the blocked-delete message).
**Where**: `app/(dashboard)/accounts/page.tsx`, `components/accounts/*`
**Depends on**: T15
**Reuses**: Account Server Actions
**Requirement**: ACC-01, ACC-02

**Tools**: MCP: NONE / Skill: `frontend-design` (visual polish/layout guidance)

**Done when**:
- [x] Can create, edit, and (attempt to) delete an account through the UI
- [x] Blocked-delete error message is shown to the user

**Tests**: none
**Gate**: build

---

### T17: Category Mongoose model

**What**: Define `Category` schema (`userId`, `name` ≤60 unique per user, `color`, `iconType`).
**Where**: `models/Category.ts`
**Depends on**: T2
**Reuses**: n/a
**Requirement**: CAT-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Compound unique index `(userId, name)` declared

**Tests**: none
**Gate**: build

---

### T18: CategoryRepository

**What**: `create`, `list(userId)`, `delete(userId, id)`.
**Where**: `repositories/category.repository.ts`
**Depends on**: T17
**Reuses**: `lib/db/connect.ts`
**Requirement**: CAT-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] CRUD paths covered; duplicate-name insert raises the unique-index error

**Tests**: integration
**Gate**: full

---

### T19: category.service

**What**: `createCategory` (maps duplicate-index error to `DuplicateCategoryError`), `deleteCategory` (blocks if `TransactionRepository.existsFor(categoryId)`).
**Where**: `services/category.service.ts`
**Depends on**: T18
**Reuses**: `CategoryRepository`
**Requirement**: CAT-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] CAT-01 AC2 (name length/duplicate) covered
- [x] CAT-01 AC3 (delete blocked with dependents) covered
- [x] CAT-01 AC4 (isolation by userId) covered

**Tests**: unit
**Gate**: quick

---

### T20: Category Server Actions

**What**: `createCategoryAction`, `deleteCategoryAction`, `listCategoriesAction`.
**Where**: `app/(dashboard)/categories/actions.ts`
**Depends on**: T19
**Reuses**: `category.service`
**Requirement**: CAT-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Happy path + blocked-delete path covered against in-memory Mongo

**Tests**: integration
**Gate**: full

---

### T21: Categories UI

**What**: `app/(dashboard)/categories/page.tsx` — list, create (name/color/icon picker), delete with confirmation.
**Where**: `app/(dashboard)/categories/page.tsx`, `components/categories/*`
**Depends on**: T20
**Reuses**: Category Server Actions
**Requirement**: CAT-01

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] Can create and delete a category through the UI; blocked-delete message shown

**Tests**: none
**Gate**: build

---

### T22: Transaction Mongoose model

**What**: Define `Transaction` schema per design (`accountId`, `toAccountId?`, `categoryId?`, `type`, `amount` cents, `date`, `description` ≤200, `isPaid`); compound index `(accountId, date, amount, description)` for import dedup.
**Where**: `models/Transaction.ts`
**Depends on**: T2
**Reuses**: n/a
**Requirement**: TXN-01..03

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Schema matches design; dedup compound index declared; `userId` index declared

**Tests**: none
**Gate**: build

---

### T23: TransactionRepository

**What**: `create(doc, session?)`, `findById(userId, id)`, `list(userId, filters)`, `update(userId, id, patch, session?)`, `delete(userId, id, session?)`, `existsFor(accountId | categoryId)`, `findDuplicates(accountId, keys[])` (for import dedup, batched `$or`/`$in` query).
**Where**: `repositories/transaction.repository.ts`
**Depends on**: T22
**Reuses**: `lib/db/connect.ts`
**Requirement**: TXN-01..03, IMP-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] CRUD + filter paths covered against in-memory Mongo
- [x] `existsFor` and `findDuplicates` covered with matching and non-matching cases

**Tests**: integration
**Gate**: full

---

### T24: transaction.service — create

**What**: `createTransaction(userId, input)` — validates amount bounds/description length, requires `categoryId` for INCOME/EXPENSE and forbids it for TRANSFER, rejects `accountId === toAccountId`, and (when `isPaid`) applies the balance effect via `mongoose.startSession().withTransaction(...)` calling `account.service.adjustBalance`.
**Where**: `services/transaction.service.ts`
**Depends on**: T23, T14
**Reuses**: `TransactionRepository`, `account.service.adjustBalance`
**Requirement**: TXN-01

**Tools**: MCP: `context7` (confirm current Mongoose transaction/session API) / Skill: NONE

**Done when**:
- [x] TXN-01 AC1 (paid INCOME/EXPENSE updates balance immediately) covered
- [x] TXN-01 AC2 (unpaid → no balance change) covered
- [x] TXN-01 AC4 (paid TRANSFER debits origin, credits destination atomically) covered
- [x] TXN-01 AC5 (same origin/destination rejected) covered
- [x] TXN-01 AC6 (amount bounds) and AC11 (description length) covered
- [x] TXN-01 AC9 (categoryId required/forbidden per type) covered

**Tests**: unit
**Gate**: quick

---

### T25: transaction.service — update

**What**: `updateTransaction(userId, id, input)` — reverts the prior balance effect (if it was paid) and applies the new one (if it becomes paid), inside one Mongo session transaction.
**Where**: `services/transaction.service.ts` (extend)
**Depends on**: T24
**Reuses**: same as T24
**Requirement**: TXN-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] TXN-01 AC3 (mark as paid → applies effect) covered
- [x] TXN-01 AC7 (edit amount/type/account on a paid transaction → revert + reapply, balance stays consistent) covered

**Tests**: unit
**Gate**: quick

---

### T26: transaction.service — delete & setPaidStatus

**What**: `deleteTransaction(userId, id)` (reverts effect if paid) and `setPaidStatus(userId, id, isPaid)`.
**Where**: `services/transaction.service.ts` (extend)
**Depends on**: T25
**Reuses**: same as T24
**Requirement**: TXN-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] TXN-01 AC8 (delete paid transaction reverts balance) covered
- [x] Toggling `isPaid` false→true→false round-trips balance back to original value

**Tests**: unit
**Gate**: quick

---

### T27: Transaction Server Actions

**What**: `createTransactionAction`, `updateTransactionAction`, `deleteTransactionAction`, `setPaidAction`, `listTransactionsAction`.
**Where**: `app/(dashboard)/transactions/actions.ts`
**Depends on**: T26
**Reuses**: `transaction.service`
**Requirement**: TXN-01..03

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] TXN-01 AC10 (list scoped to user, sorted by date desc) covered
- [x] Unauthenticated call rejected; validation errors surfaced as typed action errors

**Tests**: integration
**Gate**: full

---

### T28: Transactions UI

**What**: `app/(dashboard)/transactions/page.tsx` — list with filters, create/edit form with type-specific fields (category for INCOME/EXPENSE, destination account for TRANSFER), paid toggle, delete.
**Where**: `app/(dashboard)/transactions/page.tsx`, `components/transactions/*`
**Depends on**: T27
**Reuses**: Transaction Server Actions, Accounts UI patterns, Categories UI patterns
**Requirement**: TXN-01..03

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] Can create an INCOME, an EXPENSE, and a TRANSFER through the UI and see account balances update
- [x] Can edit and delete a transaction through the UI

**Tests**: none
**Gate**: build

---

### T29: dashboard.service

**What**: `getConsolidatedBalance(userId)` (sum of account balances) and `getMonthlySummaryByCategory(userId, month, year)` (aggregation over paid INCOME/EXPENSE, grouped by category).
**Where**: `services/dashboard.service.ts`
**Depends on**: T14, T26
**Reuses**: `AccountRepository`, `TransactionRepository`
**Requirement**: DASH-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] DASH-01 AC1 (consolidated balance) covered
- [x] DASH-01 AC2/AC3 (monthly summary, only `isPaid` transactions) covered
- [x] DASH-01 AC4 (empty month → zeroed summary, no error) covered

**Tests**: unit
**Gate**: quick

---

### T30: Dashboard Server Action

**What**: `getDashboardDataAction()` — reads session `userId`, calls `dashboard.service` for the current month.
**Where**: `app/(dashboard)/actions.ts`
**Depends on**: T29
**Reuses**: `dashboard.service`
**Requirement**: DASH-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Happy path and empty-state path covered against in-memory Mongo

**Tests**: integration
**Gate**: full

---

### T31: Dashboard UI

**What**: `app/(dashboard)/page.tsx` — consolidated balance card + monthly summary by category as a donut chart (via shadcn `chart` component / `recharts`, per `context.md`) with a category list alongside it.
**Where**: `app/(dashboard)/page.tsx`, `components/dashboard/*`
**Depends on**: T30
**Reuses**: Dashboard Server Action, shadcn/ui `chart` component (T1)
**Requirement**: DASH-01

**Tools**: MCP: `context7` (confirm current `recharts`/shadcn `chart` API before wiring) / Skill: `frontend-design`

**Done when**:
- [x] Dashboard renders consolidated balance and a donut chart + list of per-category monthly totals from seeded data

**Tests**: none
**Gate**: build

---

### T32: Budget Mongoose model

**What**: Define `Budget` schema (`userId`, `categoryId` unique per user, `limitCents`).
**Where**: `models/Budget.ts`
**Depends on**: T2
**Reuses**: n/a
**Requirement**: BUD-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Compound unique index `(userId, categoryId)` declared

**Tests**: none
**Gate**: build

---

### T33: BudgetRepository

**What**: `upsert(userId, categoryId, limitCents)`, `list(userId)`, `findByCategory(userId, categoryId)`.
**Where**: `repositories/budget.repository.ts`
**Depends on**: T32
**Reuses**: `lib/db/connect.ts`
**Requirement**: BUD-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Upsert + list paths covered against in-memory Mongo

**Tests**: integration
**Gate**: full

---

### T34: budget.service

**What**: `setBudget(userId, categoryId, limitCents)` (rejects ≤0), `getMonthlyBudgetProgress(userId, month, year)` (joins `Budget` with the month's paid `EXPENSE` sum per category from `dashboard.service`/`TransactionRepository`).
**Where**: `services/budget.service.ts`
**Depends on**: T33, T29
**Reuses**: `BudgetRepository`, `TransactionRepository`
**Requirement**: BUD-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] BUD-01 AC1 (save limit) covered
- [x] BUD-01 AC2 (over-limit flagged) covered
- [x] BUD-01 AC3 (percentage consumed while under limit) covered
- [x] BUD-01 AC4 (no limit set → no progress indicator) covered
- [x] BUD-01 AC5 (limit ≤0 rejected) covered

**Tests**: unit
**Gate**: quick

---

### T35: Budget Server Actions

**What**: `setBudgetAction(categoryId, limitCents)`, `getBudgetProgressAction()`.
**Where**: `app/(dashboard)/budgets/actions.ts`
**Depends on**: T34
**Reuses**: `budget.service`
**Requirement**: BUD-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Happy path + validation-error path covered against in-memory Mongo

**Tests**: integration
**Gate**: full

---

### T36: Budget UI integrated into Dashboard

**What**: Budget-setting form (per category) + progress bar / over-limit badge on the Dashboard UI.
**Where**: `app/(dashboard)/budgets/page.tsx`, `components/dashboard/BudgetProgress.tsx`
**Depends on**: T35, T31
**Reuses**: Dashboard UI, Budget Server Actions
**Requirement**: BUD-01

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] Setting a limit and exceeding it in a seeded month shows the over-limit indicator on the dashboard

**Tests**: none
**Gate**: build

---

### T37: Add INVESTMENT account type + UI warning badge

**What**: Add `INVESTMENT` as a fifth value to the `Account.type` enum (additive; existing CHECKING/CREDIT/SAVINGS/CASH unaffected). Add a small warning badge/text component shown wherever an `INVESTMENT` account's balance is displayed (accounts list, account selector, dashboard), reading roughly "saldo pode não refletir a valorização real do mercado — atualize manualmente se necessário".
**Where**: `models/Account.ts`, `app/(dashboard)/accounts/page.tsx`, `components/accounts/*`
**Depends on**: T16
**Reuses**: Accounts UI (T16)
**Requirement**: ACC-03

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] ACC-03 AC1 (INVESTMENT accepted as a valid type on create/edit) covered
- [x] ACC-03 AC2 (warning badge shown for INVESTMENT accounts) covered

**Tests**: none
**Gate**: build

---

### T38: Select and add OFX parsing dependency

**What**: Research current, maintained OFX-parsing options for Node/TypeScript via Context7/official docs/web search (Knowledge Verification Chain steps 3-4 — do not assume an API), pick one, add as a dependency, and document the choice + version in `design.md`'s Tech Decisions table.
**Where**: `package.json`, `.specs/features/moni-mvp/design.md` (append decision)
**Depends on**: T22
**Reuses**: n/a
**Requirement**: IMP-01

**Tools**: MCP: `context7`, `WebSearch` (if the library isn't resolvable via Context7) / Skill: NONE

**Done when**:
- [x] A specific library + version is chosen and installed, with the rationale recorded (or, if no suitable library is found, an explicit fallback of hand-rolled minimal OFX SGML parsing is documented as the decision)

**Tests**: none
**Gate**: build

---

### T39: OFX parser

**What**: `parseOfx(fileBuffer): ParsedTransaction[]` extracting date, amount (cents), description; throws `InvalidImportFileError` on unparseable input.
**Where**: `lib/parsers/ofx.ts`
**Depends on**: T38
**Reuses**: chosen OFX library
**Requirement**: IMP-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] IMP-01 AC1 (extracts date/value/description, classifies sign) covered
- [x] IMP-01 AC4 (malformed file → error, nothing partially parsed) covered

**Tests**: unit
**Gate**: quick

---

### T40: CSV parser with column mapping

**What**: `parseCsv(fileBuffer, columnMapping): ParsedTransaction[]` plus `parseBrazilianCurrencyToCents(value: string): number` (normalizes a Brazilian-format currency string — `R$` prefix, `.` thousands separator, `,` decimal separator, sign as ASCII `+`/`-` or Unicode MINUS SIGN `−` U+2212 — to signed integer cents). `parseCsv` applies `parseBrazilianCurrencyToCents` when the mapped value column matches that format, and falls back to a generic numeric parse otherwise (per design.md's "Import Service" section). Classification of INCOME vs EXPENSE comes only from the value's sign; a free-text type/description column is never used to infer it. When the source CSV has separate `data`/`hora` columns, only `data` is used (per spec.md's `hora` decision).
**Where**: `lib/parsers/csv.ts`
**Depends on**: T22
**Reuses**: n/a
**Requirement**: IMP-01

**Tools**: MCP: `context7` (confirm a current CSV-parsing library choice, e.g. `papaparse`, before use) / Skill: NONE

**Done when**:
- [x] IMP-01 AC2 (column mapping applied correctly, generic case) covered
- [x] IMP-01 AC4 (malformed file → error) covered
- [x] IMP-01 AC8 (Brazilian currency format: thousand separator + decimal comma, and Unicode minus sign U+2212 vs ASCII hyphen, correctly normalized to cents with correct sign) covered, using `test-fixtures/csv-imports/picpay-sample.csv` as a real-world fixture (referenced by path; do not paste its contents into specs, tests, or commit messages — it is gitignored real personal financial data)
- [x] Optional/empty field (e.g. `forma de pagamento` blank on some rows) does not break parsing, covered using the same fixture

**Tests**: unit
**Gate**: quick

---

### T41: MerchantCategoryRule Mongoose model

**What**: Define `MerchantCategoryRule` schema (`userId` indexed, `merchantKey` string, unique compound index `(userId, merchantKey)`, `categoryId`, `updatedAt`).
**Where**: `models/MerchantCategoryRule.ts`
**Depends on**: T17
**Reuses**: n/a
**Requirement**: CAT-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Schema matches design.md; unique compound index on `(userId, merchantKey)` declared

**Tests**: none
**Gate**: build

---

### T42: MerchantCategoryRuleRepository

**What**: `upsert(userId, merchantKey, categoryId)`, `findByMerchantKey(userId, merchantKey)`, `listByUser(userId)` (with joined category name), `listUncategorizedMerchants(userId)` (aggregation over `Transaction`: distinct `merchantKey` of EXPENSE/INCOME rows with no `categoryId` and no matching rule, with a sample description and affected count), `bulkSetCategoryForMerchant(userId, merchantKey, categoryId)` (updates every `Transaction` of that `userId` whose normalized description matches `merchantKey`, regardless of current `categoryId` — scoped by `userId`, never touching another user's data).
**Where**: `repositories/merchant-category-rule.repository.ts`
**Depends on**: T41, T23
**Reuses**: `lib/db/connect.ts`, `TransactionRepository`'s connection/model access
**Requirement**: CAT-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Upsert/find/list paths covered against in-memory Mongo, scoped by `userId`
- [x] `listUncategorizedMerchants` correctly excludes merchants that already have a rule
- [x] `bulkSetCategoryForMerchant` only updates transactions of the given `userId` (a different user's matching transactions are untouched)

**Tests**: integration
**Gate**: full

---

### T43: merchant-category-rule.service

**What**: `normalizeMerchantKey(description)` (same normalization as IMP-01 dedup), `upsertRuleFromCategorization(userId, description, categoryId)`, `suggestCategory(userId, description): Promise<ObjectId | null>`, `listUncategorizedMerchants(userId)`, `listExistingRules(userId)`, `categorizeMerchant(userId, merchantKey, categoryId)` — upserts the rule and always calls `bulkSetCategoryForMerchant` to reapply retroactively (covers both the "no rule yet" case, spec CAT-02 AC7, and the "edit existing rule" case, spec CAT-02 AC9), validating `categoryId` belongs to the user first.
**Where**: `services/merchant-category-rule.service.ts`
**Depends on**: T42
**Reuses**: `MerchantCategoryRuleRepository`, `CategoryRepository` (ownership check)
**Requirement**: CAT-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] CAT-02 AC1 (upsert on manual categorization) covered
- [x] CAT-02 AC2/AC3 (suggest/auto-apply from known rule) covered
- [x] CAT-02 AC4 (no rule → null, no guessing) covered
- [x] CAT-02 AC7 (categorizing an uncategorized merchant retroactively updates existing uncategorized transactions) covered
- [x] CAT-02 AC9 (editing an existing rule reapplies to existing transactions, including ones with the old category) covered
- [x] CAT-02 AC10 (isolation by userId on bulk update) covered

**Tests**: unit
**Gate**: quick

---

### T44: import.service — classification + routing + merchant suggestion

**What**: `classifyPicPayRow(row)` (IMP-02 routing: cofrinho guardado/resgatado, Pix para RICO/XP) + `resolveOrCreateAccountByName(userId, name, accountType)` (idempotent auto-create by normalized name) + `importTransactions(userId, accountId, parsed)` — for each row: classify via `classifyPicPayRow`; TRANSFER rows resolve/create the target account and get no `categoryId`; remaining INCOME/EXPENSE rows call `merchantCategoryRuleService.suggestCategory` and apply the result (or leave uncategorized); then dedup (normalize description, dedup key, `$in` lookup, filter duplicates), batch-insert, and adjust balance of every account touched (import source and, when applicable, TRANSFER target accounts) once with the net effect. Returns `{imported, skipped}`.
**Where**: `services/import.service.ts`
**Depends on**: T39, T40, T23, T14, T37, T43
**Reuses**: `TransactionRepository`, `account.service.adjustBalance`, `merchant-category-rule.service`
**Requirement**: IMP-01, IMP-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] IMP-01 AC3 (duplicates skipped, count reported) covered
- [x] IMP-01 AC5 (balance updated once with net effect, including TRANSFER target accounts) covered
- [x] IMP-02 AC1/AC2 (cofrinho guardado/resgatado → TRANSFER to/from auto-created SAVINGS account) covered
- [x] IMP-02 AC3 (idempotent reuse of an existing account by normalized name) covered
- [x] IMP-02 AC4 (Pix to RICO/XP → TRANSFER to "Investimentos" INVESTMENT account) covered
- [x] IMP-02 AC5 (TRANSFER rows never get a categoryId, classification happens before CAT-02 suggestion) covered
- [x] IMP-02 AC6 (rows not matching any special case fall back to normal INCOME/EXPENSE) covered

**Tests**: unit
**Gate**: quick

---

### T45: Import Server Action

**What**: `importFileAction(formData)` — validates file type/size (≤5MB, IMP-01 AC7) before parsing, dispatches to `parseOfx`/`parseCsv` by extension, calls `import.service`.
**Where**: `app/(dashboard)/import/actions.ts`
**Depends on**: T44
**Reuses**: `import.service`
**Requirement**: IMP-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Oversized file rejected before parsing (AC7)
- [x] Happy path (CSV with some duplicates, including cofrinho/investment rows) covered end-to-end against in-memory Mongo

**Tests**: integration
**Gate**: full

---

### T46: Import UI

**What**: `app/(dashboard)/import/page.tsx` — file upload, CSV column-mapping step (when CSV detected), result summary (`imported`/`skipped` counts).
**Where**: `app/(dashboard)/import/page.tsx`, `components/import/*`
**Depends on**: T45
**Reuses**: Import Server Action
**Requirement**: IMP-01

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] Can upload a sample CSV, map columns, and see the imported/skipped summary

**Tests**: none
**Gate**: build

---

### T47: Wire manual transaction categorization to merchant learning

**What**: Extend `transaction.service` (create/update paths) to call `merchantCategoryRuleService.upsertRuleFromCategorization` whenever an EXPENSE/INCOME transaction is saved with a manually-set `categoryId`. Extend the Transactions UI's create/edit form to call `suggestCategory` (via a Server Action) when the description matches a known `merchantKey`, and pre-select that category (user can still change it before saving).
**Where**: `services/transaction.service.ts`, `app/(dashboard)/transactions/*`
**Depends on**: T43, T27, T28
**Reuses**: `merchant-category-rule.service`, Transaction Server Actions, Transactions UI
**Requirement**: CAT-02

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] CAT-02 AC1 (manual categorization upserts a rule) covered
- [x] CAT-02 AC3 (manual creation form pre-selects/suggests a known category, without forcing it) covered

**Tests**: unit
**Gate**: quick

---

### T48: Merchants review Server Actions

**What**: `listUncategorizedMerchantsAction`, `listMerchantRulesAction`, `categorizeMerchantAction(merchantKey, categoryId)` — each reads `userId` from session and calls `merchant-category-rule.service`.
**Where**: `app/(dashboard)/merchants/actions.ts`
**Depends on**: T43
**Reuses**: `merchant-category-rule.service`, NextAuth session
**Requirement**: CAT-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Unauthenticated call → rejected (401-equivalent)
- [x] Happy path (list uncategorized, list rules, categorize with retroactive bulk update) covered end-to-end against in-memory Mongo

**Tests**: integration
**Gate**: full

---

### T49: Merchants review UI

**What**: `app/(dashboard)/merchants/page.tsx` — two sections: "Sem regra ainda" (each row: sample description, affected-transaction count, category picker; confirming calls `categorizeMerchantAction`) and "Regras existentes" (each row: merchant + current category, editable; changing it reapplies in bulk, same action).
**Where**: `app/(dashboard)/merchants/page.tsx`, `components/merchants/*`
**Depends on**: T48
**Reuses**: Merchants review Server Actions
**Requirement**: CAT-02

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] CAT-02 AC6 (uncategorized merchants listed with affected count) covered
- [x] CAT-02 AC7 (categorizing one applies retroactively, visible in the UI) covered
- [x] CAT-02 AC8/AC9 (existing rules listed and editable, edit reapplies in bulk) covered

**Tests**: none
**Gate**: build

---

### T50: Transaction month/date filter UI

**What**: Add a month/year (or date-range) selector to `/transactions` that filters the list, passing the range through to the existing Server Action → `transactionRepository.list` date-range filter (already used internally by `dashboard.service`, now exposed to this UI).
**Where**: `app/(dashboard)/transactions/page.tsx`, `app/(dashboard)/transactions/actions.ts`, `components/transactions/*`
**Depends on**: T27, T28
**Reuses**: `transactionRepository.list` date-range filter, Transaction Server Actions
**Requirement**: TXN-04

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] TXN-04 AC1/AC2 (selecting a month filters the list via the existing date-range filter) covered
- [x] TXN-04 AC3 (no filter selected → full list, unchanged behavior) covered

**Tests**: none
**Gate**: build

---

### T51: Mobile responsiveness audit + header bottom navigation

**What**: Retroactive audit and fix of every already-built screen (Login, Cadastro, Contas, Categorias, Transações, Dashboard, Orçamento) plus the newly-built Import/Merchants screens at ~375-414px viewport width: no horizontal overflow, forms stack to one column below ~480px, touch targets ~40px minimum. Replace `components/layout/header.tsx`'s horizontal link list with a bottom navigation bar for viewport <768px (per the Tech Decision in design.md), keeping the existing horizontal nav (or an equivalent top bar with just the logo) at ≥768px.
**Where**: `components/layout/header.tsx`, `app/(auth)/*`, `app/(dashboard)/**/page.tsx`, `components/**`
**Depends on**: T9, T10, T16, T21, T50, T31, T36, T46, T49
**Reuses**: existing UI components across all prior UI tasks
**Requirement**: UX-01

**Tools**: MCP: NONE / Skill: `frontend-design`

**Done when**:
- [x] UX-01 AC1 (no horizontal overflow at 375-414px on every listed screen) covered
- [x] UX-01 AC2 (forms stack vertically below 480px) covered
- [x] UX-01 AC3 (interactive touch targets ~40px minimum) covered
- [x] UX-01 AC4 (bottom navigation bar replaces horizontal nav below 768px) covered

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
```

(Full edge-by-edge graph is listed per phase in the Execution Plan section above; this map shows phase-level sequencing only.)

Execution is strictly sequential — one task at a time, in order, within each phase.

**Batching (51 tasks total → offer sub-agents, see below):**

| Batch | Phases | Task count |
| ----- | ------ | ---------- |
| 1 | Phase 1 + Phase 2 | 11 |
| 2 | Phase 3 + Phase 4 | 10 |
| 3 | Phase 5 | 7 |
| 4 | Phase 6 + Phase 7 | 8 |
| 5 | Phase 8 | 13 |
| 6 | Phase 9 | 2 |

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1-T4 | 1 concern each (scaffold, db connect, test harness, env) | ✅ Granular |
| T5, T12, T17, T22, T32 | 1 model each | ✅ Granular |
| T6, T13, T18, T23, T33 | 1 repository each | ✅ Granular |
| T7, T14, T19, T29, T34, T40 | 1 service each (T24-26 split the transaction service by operation, not by file) | ✅ Granular |
| T24, T25, T26 | 1 service *operation* each (create / update / delete+setPaid), same file — cohesive split of one large service | ✅ Granular (2-3 related ops, same file, cohesive) |
| T8, T11 | 1 auth-config concern each | ✅ Granular |
| T9, T10, T15, T20, T27, T35, T41 | 1 Server Action module each | ✅ Granular |
| T16, T21, T28, T31, T36, T46, T49 | 1 UI area each | ✅ Granular |
| T38, T39, T40 | 1 research/dependency + 1 parser each | ✅ Granular |
| T37 | 1 model-enum-extension + badge (small, additive, same UI area) | ✅ Granular |
| T41, T42, T43 | 1 model / 1 repository / 1 service (CAT-02 layer), same split pattern as T5/T6/T7 | ✅ Granular |
| T44 | 1 service (import routing + dedup), single file | ✅ Granular |
| T45, T48 | 1 Server Action module each | ✅ Granular |
| T47 | 1 cross-cutting wiring concern (service hook + form suggestion), same feature (CAT-02) | ✅ Granular |
| T50 | 1 UI filter concern | ✅ Granular |
| T51 | 1 retroactive audit + 1 component (header nav) — intentionally broad because it is an audit task across already-built screens, not new layered code | ✅ Granular (audit/fix task, not a new component) |

All tasks map to a single component/function/file concern. No task spans multiple unrelated layers.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ----------------------- | -------------- | ------ |
| T1 | None | (start of Phase 1) | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T2 | (Phase 1 chain shows T3→T4; T4 only truly needs T2) | ✅ Match (T4 after T3 in sequence is a valid same-phase ordering, no false dependency claimed) |
| T5 | T2 | Phase 2 start after Phase 1 | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T7 | T7→T8 | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T8 | T9→T10 (sequential slot; both actually depend on T8) | ✅ Match (same-phase ordering; true dependency is T8, satisfied before T10 runs) |
| T11 | T8 | T10→T11 (sequential slot; true dependency T8) | ✅ Match |
| T12 | T2 | Phase 3 start after Phase 2 | ✅ Match |
| T13 | T12 | T12→T13 | ✅ Match |
| T14 | T13 | T13→T14 | ✅ Match |
| T15 | T14 | T14→T15 | ✅ Match |
| T16 | T15 | T15→T16 | ✅ Match |
| T17 | T2 | Phase 4 start after Phase 3 | ✅ Match |
| T18 | T17 | T17→T18 | ✅ Match |
| T19 | T18 | T18→T19 | ✅ Match |
| T20 | T19 | T19→T20 | ✅ Match |
| T21 | T20 | T20→T21 | ✅ Match |
| T22 | T2 | Phase 5 start after Phase 4 | ✅ Match |
| T23 | T22 | T22→T23 | ✅ Match |
| T24 | T23, T14 | T23→T24 (cross-phase dep on T14 satisfied; Phase 3 already complete) | ✅ Match |
| T25 | T24 | T24→T25 | ✅ Match |
| T26 | T25 | T25→T26 | ✅ Match |
| T27 | T26 | T26→T27 | ✅ Match |
| T28 | T27 | T27→T28 | ✅ Match |
| T29 | T14, T26 | Phase 6 start after Phase 5 (both deps satisfied) | ✅ Match |
| T30 | T29 | T29→T30 | ✅ Match |
| T31 | T30 | T30→T31 | ✅ Match |
| T32 | T2 | Phase 7 start after Phase 6 | ✅ Match |
| T33 | T32 | T32→T33 | ✅ Match |
| T34 | T33, T29 | T33→T34 (cross-phase dep on T29 satisfied) | ✅ Match |
| T35 | T34 | T34→T35 | ✅ Match |
| T36 | T35, T31 | T35→T36 (cross-phase dep on T31 satisfied) | ✅ Match |
| T37 | T16 | Phase 8 start after Phase 7 (cross-phase dep on T16 satisfied) | ✅ Match |
| T38 | T22 | T22→T38 (true dependency T22, already satisfied) | ✅ Match |
| T39 | T38 | T38→T39 | ✅ Match |
| T40 | T22 | T22→T40 (true dependency T22, already satisfied) | ✅ Match |
| T41 | T17 | T17→T41 (cross-phase dep on T17 satisfied) | ✅ Match |
| T42 | T41, T23 | T41→T42, T23→T42 (cross-phase dep on T23 satisfied) | ✅ Match |
| T43 | T42 | T42→T43 | ✅ Match |
| T44 | T39, T40, T23, T14, T37, T43 | all edges present (T39→T44, T40→T44, T23→T44, T14→T44, T37→T44, T43→T44) | ✅ Match |
| T45 | T44 | T44→T45 | ✅ Match |
| T46 | T45 | T45→T46 | ✅ Match |
| T47 | T43, T27, T28 | all edges present (T43→T47, T27→T47, T28→T47) | ✅ Match |
| T48 | T43 | T43→T48 | ✅ Match |
| T49 | T48 | T48→T49 | ✅ Match |
| T50 | T27, T28 | Phase 9 start after Phase 8 (both deps satisfied) | ✅ Match |
| T51 | T9, T10, T16, T21, T50, T31, T36, T46, T49 | all edges present in Phase 9 diagram | ✅ Match |

No task depends on a later-phase task. All dependencies point backward or within the same phase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | ----------------------------- | ----------------- | ----------- | ------ |
| T1 | Project scaffold | none | none | ✅ OK |
| T2 | DB helper | none | none | ✅ OK |
| T3 | Test harness | none | none | ✅ OK |
| T4 | Env template | none | none | ✅ OK |
| T5 | Model | none | none | ✅ OK |
| T6 | Repository | integration | integration | ✅ OK |
| T7 | Service | unit | unit | ✅ OK |
| T8 | Auth config | integration | integration | ✅ OK |
| T9 | Server Action | integration | integration | ✅ OK |
| T10 | UI page | none | none | ✅ OK |
| T11 | Middleware (auth-boundary logic) | integration | integration | ✅ OK |
| T12 | Model | none | none | ✅ OK |
| T13 | Repository | integration | integration | ✅ OK |
| T14 | Service | unit | unit | ✅ OK |
| T15 | Server Action | integration | integration | ✅ OK |
| T16 | UI page | none | none | ✅ OK |
| T17 | Model | none | none | ✅ OK |
| T18 | Repository | integration | integration | ✅ OK |
| T19 | Service | unit | unit | ✅ OK |
| T20 | Server Action | integration | integration | ✅ OK |
| T21 | UI page | none | none | ✅ OK |
| T22 | Model | none | none | ✅ OK |
| T23 | Repository | integration | integration | ✅ OK |
| T24 | Service | unit | unit | ✅ OK |
| T25 | Service | unit | unit | ✅ OK |
| T26 | Service | unit | unit | ✅ OK |
| T27 | Server Action | integration | integration | ✅ OK |
| T28 | UI page | none | none | ✅ OK |
| T29 | Service | unit | unit | ✅ OK |
| T30 | Server Action | integration | integration | ✅ OK |
| T31 | UI page | none | none | ✅ OK |
| T32 | Model | none | none | ✅ OK |
| T33 | Repository | integration | integration | ✅ OK |
| T34 | Service | unit | unit | ✅ OK |
| T35 | Server Action | integration | integration | ✅ OK |
| T36 | UI page | none | none | ✅ OK |
| T37 | Model enum extension + UI badge | none | none | ✅ OK |
| T38 | Dependency research (no code layer) | none | none | ✅ OK |
| T39 | Parser | unit | unit | ✅ OK |
| T40 | Parser | unit | unit | ✅ OK |
| T41 | Model | none | none | ✅ OK |
| T42 | Repository | integration | integration | ✅ OK |
| T43 | Service | unit | unit | ✅ OK |
| T44 | Service | unit | unit | ✅ OK |
| T45 | Server Action | integration | integration | ✅ OK |
| T46 | UI page | none | none | ✅ OK |
| T47 | Service + UI wiring | unit | unit | ✅ OK |
| T48 | Server Action | integration | integration | ✅ OK |
| T49 | UI page | none | none | ✅ OK |
| T50 | UI page | none | none | ✅ OK |
| T51 | UI audit + component | none | none | ✅ OK |

No violations. Every service/parser task carries unit tests; every repository/Server Action/auth-config task carries integration tests; models and UI-only tasks correctly carry none (build gate).

---

## Commit convention

One atomic commit per task, Conventional Commits, checked by `scripts/check_commit.py`:
`feat(scope): description` for new capability, `chore(scope): description` for scaffolding/config-only tasks (T1-T4, T38). Example: `feat(transactions): add create with atomic balance update (TXN-01)`.

**Reminder (repo rule):** per this repo's `CLAUDE.md`, commits are never executed automatically during Execute — each task's changes are left in the working tree, and the user commits manually after reviewing. This overrides the skill's default "one atomic commit per task" automation; the task boundary and message are still planned per-task as above, for the user to use.
