import bcrypt from "bcryptjs";
import { userRepository, DuplicateEmailError } from "@/repositories/user.repository";

export { DuplicateEmailError };

const SALT_ROUNDS = 10;

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export async function registerUser(input: RegisterUserInput) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return user;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
