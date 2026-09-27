import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const Account = mongoose.connection.collection("accounts");
  const Transaction = mongoose.connection.collection("transactions");

  const accounts = await Account.find({}).toArray();
  
  for (const acc of accounts) {
    const accIdStr = String(acc._id);
    
    // Calculate sum of transactions
    const txs = await Transaction.find({
      $or: [{ accountId: acc._id }, { toAccountId: acc._id }]
    }).toArray();
    
    let calc = 0;
    let income = 0;
    let expense = 0;
    let transferIn = 0;
    let transferOut = 0;

    for (const tx of txs) {
      if (String(tx.accountId) === accIdStr) {
        if (tx.type === "INCOME") { calc += tx.amount; income += tx.amount; }
        else if (tx.type === "EXPENSE") { calc -= tx.amount; expense += tx.amount; }
        else if (tx.type === "TRANSFER") { calc -= tx.amount; transferOut += tx.amount; }
      }
      if (String(tx.toAccountId) === accIdStr && tx.type === "TRANSFER") {
        calc += tx.amount;
        transferIn += tx.amount;
      }
    }
    
    console.log(`\nAccount: ${acc.name} - DB Balance: ${acc.balance} | Calculated: ${calc} | INCOME: ${income}, EXPENSE: ${expense}, TR_IN: ${transferIn}, TR_OUT: ${transferOut}`);
    if (calc !== acc.balance) {
      console.log(`  [WARN] DB Balance mismatch! Fixing in memory for display only...`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
