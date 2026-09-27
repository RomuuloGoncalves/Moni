/**
 * Normalizes a transaction description for both import dedup (IMP-01) and
 * merchant-rule keying (CAT-02): lowercase, trim, collapse internal
 * whitespace runs to a single space.
 */
export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/** CAT-02's `merchantKey` uses the exact same normalization as IMP-01 dedup. */
export const normalizeMerchantKey = normalizeDescription;
