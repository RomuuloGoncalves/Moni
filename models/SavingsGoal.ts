import mongoose, { Schema, type InferSchemaType } from "mongoose";

const savingsGoalSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, required: true, index: true },
  name:         { type: String, required: true, maxlength: 60 },
  targetCents:  { type: Number, required: true },
  currentCents: { type: Number, required: true, default: 0 },
  deadline:     { type: Date, required: false },
  color:        { type: String, required: true, default: "#6366f1" },
  iconType:     { type: String, required: true, default: "piggy-bank" },
  createdAt:    { type: Date, default: () => new Date() },
});

export type SavingsGoalDoc = InferSchemaType<typeof savingsGoalSchema>;

export const SavingsGoal =
  mongoose.models.SavingsGoal ?? mongoose.model("SavingsGoal", savingsGoalSchema);

export default SavingsGoal;
