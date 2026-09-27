import { connectDB } from "@/lib/db/connect";
import { Account, type AccountType } from "@/models/Account";
import type { ClientSession } from "mongoose";

export interface CreateAccountInput {
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
}

export const accountRepository = {
  async create(input: CreateAccountInput, session?: ClientSession) {
    await connectDB();
    const [doc] = await Account.create([input], { session });
    return doc.toObject();
  },

  async findById(userId: string, id: string) {
    await connectDB();
    const doc = await Account.findOne({ _id: id, userId }).lean();
    return doc;
  },

  async list(userId: string) {
    await connectDB();
    const docs = await Account.find({ userId }).sort({ createdAt: 1 }).lean();
    return docs;
  },

  async update(userId: string, id: string, input: UpdateAccountInput) {
    await connectDB();
    const doc = await Account.findOneAndUpdate(
      { _id: id, userId },
      { $set: input },
      { returnDocument: "after" }
    ).lean();
    return doc;
  },

  async delete(userId: string, id: string) {
    await connectDB();
    const res = await Account.deleteOne({ _id: id, userId });
    return res.deletedCount === 1;
  },

  async adjustBalance(id: string, deltaCents: number, session?: ClientSession) {
    await connectDB();
    const doc = await Account.findByIdAndUpdate(
      id,
      { $inc: { balance: deltaCents } },
      { returnDocument: "after", session }
    ).lean();
    return doc;
  },
};

export default accountRepository;
