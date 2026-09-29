import { savingsGoalRepository } from "@/repositories/savings-goal.repository";

export interface CreateSavingsGoalInput {
  name: string;
  targetCents: number;
  deadline?: Date;
  color?: string;
  iconType?: string;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetCents?: number;
  deadline?: Date | null;
  color?: string;
  iconType?: string;
}

export const savingsGoalService = {
  async list(userId: string) {
    return savingsGoalRepository.list(userId);
  },

  async create(userId: string, input: CreateSavingsGoalInput) {
    return savingsGoalRepository.create({ ...input, userId });
  },

  async update(userId: string, id: string, patch: UpdateSavingsGoalInput) {
    return savingsGoalRepository.update(id, userId, patch);
  },

  async addContribution(userId: string, id: string, amountCents: number) {
    if (amountCents <= 0) throw new Error("Contribution must be positive");
    return savingsGoalRepository.addContribution(id, userId, amountCents);
  },

  async delete(userId: string, id: string) {
    return savingsGoalRepository.delete(id, userId);
  },
};
