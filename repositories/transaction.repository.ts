import { connectDB } from "@/lib/db/connect";
import { Transaction, type TransactionType } from "@/models/Transaction";
import mongoose, { type ClientSession } from "mongoose";

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  isPaid: boolean;
}

export interface UpdateTransactionInput {
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  type?: TransactionType;
  amount?: number;
  date?: Date;
  description?: string;
  isPaid?: boolean;
}

export interface ListTransactionsFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: Date;
  to?: Date;
}

export interface DuplicateKey {
  date: Date;
  amount: number;
  description: string;
}

export const transactionRepository = {
  async create(input: CreateTransactionInput, session?: ClientSession) {
    await connectDB();
    const [doc] = await Transaction.create([input], { session });
    return doc.toObject();
  },

  async findById(userId: string, id: string) {
    await connectDB();
    const doc = await Transaction.findOne({ _id: id, userId }).lean();
    return doc;
  },

  async list(userId: string, filters: ListTransactionsFilters = {}) {
    await connectDB();
    const query: Record<string, unknown> = { userId };
    if (filters.accountId) {
      query.accountId = filters.accountId;
    }
    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.from || filters.to) {
      const dateFilter: Record<string, Date> = {};
      if (filters.from) dateFilter.$gte = filters.from;
      if (filters.to) dateFilter.$lte = filters.to;
      query.date = dateFilter;
    }
    const docs = await Transaction.find(query).sort({ date: -1 }).lean();
    return docs;
  },

  async update(
    userId: string,
    id: string,
    patch: UpdateTransactionInput,
    session?: ClientSession
  ) {
    await connectDB();
    const doc = await Transaction.findOneAndUpdate(
      { _id: id, userId },
      { $set: patch },
      { returnDocument: "after", session }
    ).lean();
    return doc;
  },

  async updateTags(userId: string, id: string, tags: string[]) {
    await connectDB();
    return Transaction.findOneAndUpdate(
      { _id: id, userId },
      { $set: { tags } },
      { returnDocument: "after" }
    ).lean();
  },

  async delete(userId: string, id: string, session?: ClientSession) {
    await connectDB();
    const res = await Transaction.deleteOne({ _id: id, userId }, { session });
    return res.deletedCount === 1;
  },

  async existsFor(params: { accountId?: string; categoryId?: string }) {
    await connectDB();
    const conditions: Record<string, unknown>[] = [];
    if (params.accountId) {
      const objectId = new mongoose.Types.ObjectId(params.accountId);
      conditions.push({ accountId: objectId }, { toAccountId: objectId });
    }
    if (params.categoryId) {
      conditions.push({ categoryId: new mongoose.Types.ObjectId(params.categoryId) });
    }
    if (conditions.length === 0) {
      return false;
    }
    const count = await Transaction.countDocuments({ $or: conditions });
    return count > 0;
  },

  async findDuplicates(accountId: string, keys: DuplicateKey[]) {
    await connectDB();
    if (keys.length === 0) {
      return [];
    }
    const docs = await Transaction.find({
      accountId,
      $or: keys.map((key) => ({
        date: key.date,
        amount: key.amount,
        description: key.description,
      })),
    }).lean();
    return docs;
  },
};

export default transactionRepository;
