import mongoose, { Schema, type InferSchemaType } from "mongoose";

const categorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  color: { type: String, required: true },
  iconType: { type: String, required: true },
});

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;

export const Category = mongoose.models.Category ?? mongoose.model("Category", categorySchema);

export default Category;
