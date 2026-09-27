import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const Account = mongoose.connection.collection("accounts");
  const Transaction = mongoose.connection.collection("transactions");

  const picpay = await Account.findOne({ name: { $regex: /PicPay/i } });
  if (!picpay) throw new Error("PicPay account not found");

  const desiredBalance = 21; // R$ 0,21
  const currentBalance = picpay.balance || 0;
  
  const delta = desiredBalance - currentBalance;
  if (delta !== 0) {
    const type = delta > 0 ? "INCOME" : "EXPENSE";
    const amount = Math.abs(delta);
    
    console.log(`Adjusting PicPay balance from ${currentBalance} to ${desiredBalance}. Delta: ${delta}`);
    
    const backdate = new Date("2026-08-31T23:59:59.000Z");

    await Transaction.insertOne({
      userId: picpay.userId,
      accountId: picpay._id,
      type,
      amount,
      date: backdate, // Backdated to not pollute September
      description: "Ajuste de Saldo Inicial",
      isPaid: true,
      createdAt: new Date(),
    });

    await Account.updateOne(
      { _id: picpay._id },
      { $set: { balance: desiredBalance } }
    );
    console.log("Done.");
  } else {
    console.log("Already at desired balance.");
  }

  process.exit(0);
}

run().catch(console.error);
