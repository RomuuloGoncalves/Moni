import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const ACCOUNT_TYPES = ["CHECKING", "CREDIT", "SAVINGS", "CASH", "INVESTMENT"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

const accountSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  type: { type: String, required: true, enum: ACCOUNT_TYPES },
  balance: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
});

export type AccountDoc = InferSchemaType<typeof accountSchema>;

export const Account = mongoose.models.Account ?? mongoose.model("Account", accountSchema);

export default Account;
