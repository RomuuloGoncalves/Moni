import mongoose, { Schema, type InferSchemaType } from "mongoose";

const merchantCategoryRuleSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  merchantKey: { type: String, required: true },
  categoryId: { type: Schema.Types.ObjectId, required: true },
  updatedAt: { type: Date, default: () => new Date() },
});

merchantCategoryRuleSchema.index({ userId: 1, merchantKey: 1 }, { unique: true });

export type MerchantCategoryRuleDoc = InferSchemaType<typeof merchantCategoryRuleSchema>;

export const MerchantCategoryRule =
  mongoose.models.MerchantCategoryRule ??
  mongoose.model("MerchantCategoryRule", merchantCategoryRuleSchema);

export default MerchantCategoryRule;
