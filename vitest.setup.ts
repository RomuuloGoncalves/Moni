import { afterAll, afterEach, beforeAll } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  process.env.MONGODB_URI = replSet.getUri();
  await connectDB();
}, 60000);

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
}, 60000);
