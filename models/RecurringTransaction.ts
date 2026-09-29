import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const RECURRING_FREQUENCIES = ["MONTHLY", "WEEKLY", "BIWEEKLY", "YEARLY"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const RECURRING_TYPES = ["INCOME", "EXPENSE"] as const;
export type RecurringType = (typeof RECURRING_TYPES)[number];

const recurringTransactionSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, required: true, index: true },
  accountId:   { type: Schema.Types.ObjectId, required: true },
  categoryId:  { type: Schema.Types.ObjectId, required: false },
  type:        { type: String, required: true, enum: RECURRING_TYPES },
  amountCents: { type: Number, required: true },
  description: { type: String, required: true, maxlength: 200 },
  frequency:   { type: String, required: true, enum: RECURRING_FREQUENCIES },
  startDate:   { type: Date, required: true },
  nextDueDate: { type: Date, required: true },
  isActive:    { type: Boolean, required: true, default: true },
  lastGeneratedYearMonth: { type: String, default: null }, // "YYYY-MM"
  createdAt:   { type: Date, default: () => new Date() },
});

export type RecurringTransactionDoc = InferSchemaType<typeof recurringTransactionSchema>;

export const RecurringTransaction =
  mongoose.models.RecurringTransaction ??
  mongoose.model("RecurringTransaction", recurringTransactionSchema);

export default RecurringTransaction;
