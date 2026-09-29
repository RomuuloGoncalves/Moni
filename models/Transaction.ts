import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const transactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  accountId: { type: Schema.Types.ObjectId, required: true, index: true },
  toAccountId: { type: Schema.Types.ObjectId, required: false },
  categoryId: { type: Schema.Types.ObjectId, required: false },
  type: { type: String, required: true, enum: TRANSACTION_TYPES },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true, maxlength: 200 },
  isPaid: { type: Boolean, required: true, default: false },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: () => new Date() },
});

// Dedup index for import (IMP-01): same account + date + amount + description
// is treated as a duplicate transaction.
transactionSchema.index({ accountId: 1, date: 1, amount: 1, description: 1 });

// Performance indexes for Dashboard and transaction listing
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ accountId: 1, date: -1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema>;

export const Transaction =
  mongoose.models.Transaction ?? mongoose.model("Transaction", transactionSchema);

export default Transaction;
