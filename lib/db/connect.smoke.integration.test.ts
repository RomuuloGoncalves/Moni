import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";

// Throwaway smoke test for the Vitest + mongodb-memory-server harness (T3).
// Confirms the in-memory Mongo instance boots, connectDB() connects to it,
// and a trivial write/read round-trip works.
describe("test harness smoke test", () => {
  it("boots an in-memory Mongo instance and connects", async () => {
    const conn = await connectDB();
    expect(conn.connection.readyState).toBe(1);
  });

  it("can read/write against the in-memory instance", async () => {
    await connectDB();
    const Smoke = mongoose.models.Smoke ?? mongoose.model("Smoke", new mongoose.Schema({ ok: Boolean }));
    await Smoke.create({ ok: true });
    const found = await Smoke.findOne({ ok: true });
    expect(found?.ok).toBe(true);
  });
});
