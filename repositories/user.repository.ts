import { connectDB } from "@/lib/db/connect";
import { User } from "@/models/User";

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists`);
    this.name = "DuplicateEmailError";
  }
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export const userRepository = {
  async create(input: CreateUserInput) {
    await connectDB();
    try {
      const doc = await User.create(input);
      return doc.toObject();
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new DuplicateEmailError(input.email);
      }
      throw err;
    }
  },

  async findByEmail(email: string) {
    await connectDB();
    const doc = await User.findOne({ email }).lean();
    return doc;
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

export default userRepository;
