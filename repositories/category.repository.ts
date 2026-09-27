import { connectDB } from "@/lib/db/connect";
import { Category } from "@/models/Category";

export class DuplicateCategoryError extends Error {
  constructor(name: string) {
    super(`A category named "${name}" already exists for this user`);
    this.name = "DuplicateCategoryError";
  }
}

export interface CreateCategoryInput {
  userId: string;
  name: string;
  color: string;
  iconType: string;
}

export const categoryRepository = {
  async create(input: CreateCategoryInput) {
    await connectDB();
    try {
      const doc = await Category.create(input);
      return doc.toObject();
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new DuplicateCategoryError(input.name);
      }
      throw err;
    }
  },

  async list(userId: string) {
    await connectDB();
    const docs = await Category.find({ userId }).sort({ name: 1 }).lean();
    return docs;
  },

  async findById(userId: string, id: string) {
    await connectDB();
    const doc = await Category.findOne({ _id: id, userId }).lean();
    return doc;
  },

  async update(
    userId: string,
    id: string,
    data: { name: string; color: string; iconType: string }
  ) {
    await connectDB();
    try {
      const doc = await Category.findOneAndUpdate(
        { _id: id, userId },
        { $set: data },
        { returnDocument: 'after' }
      ).lean();
      return doc;
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new DuplicateCategoryError(data.name);
      }
      throw err;
    }
  },

  async delete(userId: string, id: string) {
    await connectDB();
    const res = await Category.deleteOne({ _id: id, userId });
    return res.deletedCount === 1;
  },
};

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export default categoryRepository;
