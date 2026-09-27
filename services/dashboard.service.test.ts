import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/connect", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/account.repository", () => ({
  accountRepository: {
    list: vi.fn(),
  },
}));

vi.mock("@/repositories/transaction.repository", () => ({
  transactionRepository: {
    list: vi.fn(),
  },
}));

import { accountRepository } from "@/repositories/account.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { dashboardService } from "@/services/dashboard.service";

const accountRepo = vi.mocked(accountRepository);
const txnRepo = vi.mocked(transactionRepository);

describe("dashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DASH-01 AC1: getConsolidatedBalance sums the balance of every account", async () => {
    accountRepo.list.mockResolvedValue([
      { _id: "a1", balance: 10000 },
      { _id: "a2", balance: -2500 },
      { _id: "a3", balance: 500 },
    ] as never);

    const total = await dashboardService.getConsolidatedBalance("user1");

    expect(total).toBe(8000);
    expect(accountRepo.list).toHaveBeenCalledWith("user1");
  });

  it("DASH-01 AC2/AC3: getMonthlySummaryByCategory groups only paid INCOME/EXPENSE by category", async () => {
    txnRepo.list.mockResolvedValue([
      { categoryId: "catFood", type: "EXPENSE", amount: 3000, isPaid: true },
      { categoryId: "catFood", type: "EXPENSE", amount: 1000, isPaid: true },
      { categoryId: "catFood", type: "EXPENSE", amount: 99999, isPaid: false }, // unpaid: excluded
      { categoryId: "catSalary", type: "INCOME", amount: 500000, isPaid: true },
      { categoryId: "catSalary", type: "TRANSFER", amount: 20000, isPaid: true }, // transfer: excluded
    ] as never);

    const summary = await dashboardService.getMonthlySummaryByCategory("user1", 3, 2026);

    expect(txnRepo.list).toHaveBeenCalledWith(
      "user1",
      expect.objectContaining({
        from: new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0)),
        to: new Date(Date.UTC(2026, 3, 0, 23, 59, 59, 999)),
      })
    );
    expect(summary).toEqual(
      expect.arrayContaining([
        { categoryId: "catFood", income: 0, expense: 4000 },
        { categoryId: "catSalary", income: 500000, expense: 0 },
      ])
    );
    expect(summary).toHaveLength(2);
  });

  it("DASH-01 AC4: empty month yields an empty summary, no error", async () => {
    txnRepo.list.mockResolvedValue([]);

    const summary = await dashboardService.getMonthlySummaryByCategory("user1", 1, 2026);

    expect(summary).toEqual([]);
  });
});
