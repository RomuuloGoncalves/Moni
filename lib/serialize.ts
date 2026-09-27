/**
 * Server Actions and Server Components can only pass plain, JSON-serializable
 * values across the RSC boundary. Mongoose documents (even after `.lean()` or
 * `.toObject()`) still carry `ObjectId`/`Decimal128` instances for `_id`,
 * `userId`, foreign keys, etc. — these have a `toJSON()` method but aren't
 * plain objects, which React flags at runtime ("Only plain objects can be
 * passed to Client Components..."). Round-tripping through JSON forces every
 * such value through its `toJSON()`, yielding plain strings/numbers.
 */
export function toPlainObject<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}
