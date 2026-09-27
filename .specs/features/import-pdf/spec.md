# Import PicPay Credit Card PDF Specification

## Problem Statement

Currently, the system only supports importing transactions via CSV and OFX. However, PicPay credit card statements (faturas) are provided as PDFs. Credit card purchases are not included in the checking account CSV, so users need a way to import their credit card statement PDFs to track those expenses. Additionally, we need to ensure that transactions are deduplicated correctly.

## Goals

- [ ] Support importing PicPay credit card statement PDFs.
- [ ] Parse transactions, handling dates (inferring the year from the invoice due date) and amounts correctly.
- [ ] Avoid duplicating transactions that might have already been imported.

## Out of Scope

| Feature     | Reason         |
| ----------- | -------------- |
| Support for other banks' PDFs | Focus on PicPay Mastercard Gold format first to solve the immediate problem. |
| Automatic invoice payment matching | Complex state tracking; for MVP, just import the transactions as expenses. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default  | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| PDF Parsing Library | Use `pdf-parse` in the Node.js backend. | Standard, reliable library for extracting text from PDFs in Node.js. | n |
| Transaction Year | The year of each transaction will be inferred from the invoice due date (e.g., `Vencimento: 10/09/2026` means year is 2026, or 2025 if the transaction month is > 09). | PDF lines only have `DD/MM` for transaction dates. | n |
| Deduplication Scope | Deduplication currently looks at transactions within the *same* account. If a user uploads the CSV to a "Checking" account and the PDF to a "Credit Card" account, they won't be deduplicated against each other. | This is standard behavior, but if they upload to the same account, the existing logic handles it. | n |
| Negative Values | Negative amounts in the PDF (e.g. `PAGAMENTO DE FATURA -50,00`) represent payments to the credit card. We will import them as `INCOME` or `TRANSFER` (similar to CSV). | Consistency with how transactions are handled. | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Import PDF Statement ⭐ MVP

**User Story**: As a user, I want to upload my PicPay credit card PDF statement so that I can track my credit purchases without manual entry.

**Why P1**: Essential for users who use the credit function of PicPay.

**Acceptance Criteria**:

1. WHEN the user uploads a valid PicPay PDF statement THEN the system SHALL parse the text and extract all transactions (date, description, amount).
2. IF the file is not a valid PDF or the format is unrecognized THEN the system SHALL reject the import with an error message.
3. The system SHALL deduce the transaction year using the invoice due date found in the PDF header.
4. The system SHALL skip importing any transaction that matches an already existing transaction (same date, amount, and normalized description) in the target account.

**Independent Test**: Upload the provided PicPay PDF to an account. Verify that "CURSOR, AI POWERED IDE" is imported as an expense of R$ 105,84 on 04/08/2026.

---

## Edge Cases

- IF the transaction date is in December and the invoice due date is in January THEN the system SHALL correctly assign the previous year to the transaction.
- IF a transaction description contains multiple spaces or special characters THEN the system SHALL normalize it for deduplication.

---

## Requirement Traceability

| Requirement ID | Story       | Phase  | Status  |
| -------------- | ----------- | ------ | ------- |
| IMPORT-01  | P1: Import  | Design | Pending |
| IMPORT-02  | P1: Import  | Design | Pending |
| IMPORT-03  | P1: Import  | Design | Pending |
| IMPORT-04  | P1: Import  | Design | Pending |

**Coverage:** 4 total, 0 mapped to tasks, 4 unmapped ⚠️

---

## Success Criteria

- [ ] PicPay PDF can be successfully uploaded and parsed.
- [ ] Transactions are correctly classified as expenses (or payments).
- [ ] No duplicate transactions are created when re-importing.
