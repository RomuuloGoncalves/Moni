import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const Transaction = mongoose.connection.collection("transactions");

  const backdate = new Date("2026-08-31T23:59:59.000Z");

  const res1 = await Transaction.updateMany(
    { description: "Ajuste de Saldo Inicial" },
    { $set: { date: backdate } }
  );

  console.log(`Backdated ${res1.modifiedCount} 'Ajuste de Saldo Inicial' transactions.`);

  const res2 = await Transaction.updateMany(
    { description: "Rendimento CDI (Ajuste Manual)" },
    { $set: { date: backdate } }
  );

  console.log(`Backdated ${res2.modifiedCount} 'Rendimento CDI' transactions.`);

  process.exit(0);
}

run().catch(console.error);
