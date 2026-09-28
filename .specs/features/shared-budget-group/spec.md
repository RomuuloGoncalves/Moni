# Shared Budget Group Specification

## Problem Statement

Some expense categories are related (e.g. Mercado and Refeição) and should share one monthly spending limit instead of separate per-category budgets.

## Goals

- [ ] Create named budget groups linking two or more categories to a single monthly limit (centavos).
- [ ] Show combined progress on the dashboard: one bar with stacked segments colored by each member category.
- [ ] Keep solo per-category budgets for categories not in any group.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Aggregating donut chart by group | Dashboard category chart stays per category |
| Auto-summing old individual limits when creating a group | User picks one new shared limit |

---

## User Stories

### P1: Budget group CRUD

**Acceptance Criteria**:

1. WHEN the user creates a group with name, limit &gt; 0, and ≥2 owned categories THEN the system SHALL persist a `BudgetGroup` and remove any individual `Budget` for those categories.
2. IF a category already belongs to another group THEN the system SHALL reject the operation.
3. IF the user sets an individual budget for a category that is in a group THEN the system SHALL reject with a clear error.
4. WHEN the user deletes a group THEN member categories SHALL have no budget until set again (solo or new group).

### P2: Monthly progress

**Acceptance Criteria**:

1. WHEN calculating progress for a group THEN `spentCents` SHALL be the sum of paid EXPENSE in the month for all member categories.
2. WHEN displaying the group bar THEN segments SHALL use each category's color and reflect each member's share of total spend within the filled portion of the bar.
3. WHEN `spentCents > limitCents` THEN the UI SHALL show an over-limit badge.

### P3: Category delete

**Acceptance Criteria**:

1. WHEN a category in a group is deleted THEN it SHALL be removed from the group; IF fewer than two members remain THEN the group SHALL be dissolved.
