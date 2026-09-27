import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const Account = mongoose.connection.collection("accounts");
  const Transaction = mongoose.connection.collection("transactions");

  const savingsAccounts = await Account.find({ type: "SAVINGS", balance: { $lt: 0 } }).toArray();
  
  for (const acc of savingsAccounts) {
    let desiredBalance = 0;
    
    // User requested "Refeição Obrigatória" to be 0.02 BRL
    if (acc.name.toLowerCase().includes("refeição")) {
      desiredBalance = 2; // 2 cents
    }
    
    const delta = desiredBalance - acc.balance;
    if (delta > 0) {
      console.log(`Adjusting ${acc.name} from ${acc.balance} to ${desiredBalance}. Added yield: ${delta}`);
      
      await Transaction.insertOne({
        userId: acc.userId,
        accountId: acc._id,
        type: "INCOME",
        amount: delta,
        date: new Date(),
        description: "Rendimento CDI (Ajuste Manual)",
        isPaid: true,
        createdAt: new Date(),
      });

      await Account.updateOne(
        { _id: acc._id },
        { $set: { balance: desiredBalance } }
      );
    }
  }

  console.log("Done fixing savings accounts.");
  process.exit(0);
}

run().catch(console.error);
