/**
 * Normalizes a transaction description for both import dedup (IMP-01) and
 * merchant-rule keying (CAT-02): lowercase, trim, collapse internal
 * whitespace runs to a single space.
 */
export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Normalizes a raw description into a stable merchantKey.
 *
 * On top of normalizeDescription, this strips artifacts introduced by
 * card-statement CSV/PDF parsers:
 *
 *  • "compra realizada - MERCHANT CIDADE BRA" → "merchant"
 *  • "pagamento realizado - THING" → "pagamento realizado - thing"  (kept as-is)
 *  • "X *MERCHANT" → "x*merchant"  (space before asterisk removed)
 *  • "BRAND*CPF_OR_ID name" → "brand"  (99food, mercadolivre, etc.)
 */
export function normalizeMerchantKey(description: string): string {
  let key = normalizeDescription(description);

  // Strip "compra realizada - " prefix + optional " CITY BRA" suffix
  // e.g. "compra realizada - comercial esperanca lo sorocaba bra" → "comercial esperanca lo"
  const cardPurchasePrefix = "compra realizada - ";
  if (key.startsWith(cardPurchasePrefix)) {
    key = key.slice(cardPurchasePrefix.length);
    // Strip trailing " CITY bra" — city is always the single word immediately before "bra"
    // e.g. "hamburgueria lanches sorocaba bra" → "hamburgueria lanches"
    key = key.replace(/\s+\S+\s+bra$/, "").trim();
    return key;
  }

  // Remove space before asterisk: "dl *uberrides" → "dl*uberrides"
  key = key.replace(/\s+\*/g, "*");

  // Strip CPF/CNPJ-like suffixes after asterisk in aggregator names
  // e.g. "99food *63.037.825 ism" → "99food", "mercadolivre*mercadol" → "mercadolivre"
  key = key.replace(/^(99food|mercadolivre|ifood|rappi|uber)\*.*$/, "$1");

  return key;
}
