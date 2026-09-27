# Edit Category Specification

## Problem Statement

Currently, users can create and delete categories, but they cannot edit existing ones. If they want to change a category's name, color, or icon, they must delete and recreate it. However, they cannot delete a category if it already has linked transactions. We need a way to edit an existing category directly.

## Goals

- [ ] Users can edit the name, color, and icon of an existing category.
- [ ] Users can edit categories that already have transactions linked to them.

## Out of Scope

| Feature     | Reason         |
| ----------- | -------------- |
| Merging categories | Out of scope for this feature; focusing only on editing single categories. |
| Bulk editing | Keep it simple for MVP. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default  | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Duplicate name | Return an error if the new name matches another existing category for the same user. | Required by the unique constraint on the database. | y |
| No-op update | If a user saves without changing any fields, it should return success. | Standard behavior for edit forms. | y |
| Transaction relation | Editing a category does not affect linked transactions. | The transactions are linked by `categoryId` (ObjectId), so changing the category metadata doesn't break the relation. | y |

**Open questions:** none.

---

## User Stories

### P1: Edit Category Metadata ⭐ MVP

**User Story**: As a user, I want to edit the name, color, and icon of my categories so that I can keep my budget organized without having to recreate categories.

**Why P1**: Essential for basic category management.

**Acceptance Criteria**:

1. WHEN the user submits valid updated category details (name, color, iconType) THEN the system SHALL update the category in the database and reflect changes in the UI.
2. IF the updated category name is empty or exceeds 60 characters THEN the system SHALL reject the update with a validation error.
3. IF the updated category name matches an existing category belonging to the same user THEN the system SHALL reject the update with a duplicate category error.
4. IF the user attempts to edit a category that does not exist or does not belong to them THEN the system SHALL return a not found error.
5. The system SHALL maintain the link to any existing transactions associated with the category.

**Independent Test**: Create a category, link a transaction to it, click "Edit", change the name and color, and verify the category is updated in the list and the transaction still shows the new category details.

---

## Edge Cases

- IF the user submits the exact same details THEN the system SHALL process the update successfully without errors.
- IF the database unique constraint is violated concurrently THEN the system SHALL handle the `DuplicateCategoryError` gracefully and show it to the user.

---

## Requirement Traceability

| Requirement ID | Story       | Phase  | Status  |
| -------------- | ----------- | ------ | ------- |
| CATEGORY-01    | P1: Edit    | Design | Pending |
| CATEGORY-02    | P1: Edit    | Design | Pending |
| CATEGORY-03    | P1: Edit    | Design | Pending |
| CATEGORY-04    | P1: Edit    | Design | Pending |

**Coverage:** 4 total, 0 mapped to tasks, 4 unmapped ⚠️

---

## Success Criteria

- [ ] User can successfully edit a category via the UI and see the changes immediately.
- [ ] Editing a category does not break existing transactions.
- [ ] Appropriate validation messages are shown for duplicate or invalid names.
