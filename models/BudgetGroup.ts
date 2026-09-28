import mongoose, { Schema, type InferSchemaType } from "mongoose";

const budgetGroupSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  limitCents: { type: Number, required: true },
  categoryIds: [{ type: Schema.Types.ObjectId, required: true }],
  createdAt: { type: Date, default: () => new Date() },
});

budgetGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

export type BudgetGroupDoc = InferSchemaType<typeof budgetGroupSchema>;

export const BudgetGroup =
  mongoose.models.BudgetGroup ?? mongoose.model("BudgetGroup", budgetGroupSchema);

export default BudgetGroup;
