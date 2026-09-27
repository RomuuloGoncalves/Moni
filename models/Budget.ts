import mongoose, { Schema, type InferSchemaType } from "mongoose";

const budgetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  categoryId: { type: Schema.Types.ObjectId, required: true },
  limitCents: { type: Number, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

// One recurring monthly limit per category per user (no month/year field —
// see design.md's "Orçamento" tech decision).
budgetSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

export type BudgetDoc = InferSchemaType<typeof budgetSchema>;

export const Budget = mongoose.models.Budget ?? mongoose.model("Budget", budgetSchema);

export default Budget;
