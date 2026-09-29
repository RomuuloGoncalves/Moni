/**
 * Migra merchantKeys existentes para o novo padrão normalizado.
 *
 * Para cada regra no banco:
 *  - Recalcula o merchantKey usando normalizeMerchantKey (nova lógica)
 *  - Se a chave mudou, atualiza ou faz merge com regra existente de mesma chave
 *
 * Uso: npx tsx scripts/migrate-merchant-keys.ts
 * Passe --dry-run para ver o que seria alterado sem gravar.
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../lib/db/connect";
import { MerchantCategoryRule } from "../models/MerchantCategoryRule";
import { normalizeMerchantKey } from "../lib/import/normalize";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  await connectDB();

  const allRules = await MerchantCategoryRule.find({}).lean();
  console.log(`Total de regras: ${allRules.length}${DRY_RUN ? "  [DRY RUN]" : ""}\n`);

  let changed = 0;
  let merged = 0;
  let unchanged = 0;

  for (const rule of allRules) {
    const oldKey = rule.merchantKey as string;
    const newKey = normalizeMerchantKey(oldKey);

    if (newKey === oldKey) {
      unchanged++;
      continue;
    }

    console.log(`  "${oldKey}"`);
    console.log(`    → "${newKey}"`);

    if (DRY_RUN) {
      changed++;
      continue;
    }

    // Verifica se já existe uma regra com a nova chave para esse usuário
    const existing = await MerchantCategoryRule.findOne({
      userId: rule.userId,
      merchantKey: newKey,
      _id: { $ne: rule._id },
    }).lean();

    if (existing) {
      // Mantém a regra mais recente e remove a mais antiga
      const keepId = (existing.updatedAt ?? 0) >= (rule.updatedAt ?? 0)
        ? existing._id
        : rule._id;
      const removeId = keepId.equals(existing._id) ? rule._id : existing._id;

      await MerchantCategoryRule.deleteOne({ _id: removeId });
      // Garante que a regra mantida tem a nova chave
      await MerchantCategoryRule.updateOne(
        { _id: keepId },
        { $set: { merchantKey: newKey } }
      );
      console.log(`    ⚠ merge: removida regra duplicada ${removeId}`);
      merged++;
    } else {
      await MerchantCategoryRule.updateOne(
        { _id: rule._id },
        { $set: { merchantKey: newKey } }
      );
      changed++;
    }
  }

  console.log(`\nResumo:`);
  console.log(`  Sem alteração:  ${unchanged}`);
  console.log(`  Atualizadas:    ${changed}`);
  console.log(`  Mergeadas:      ${merged}`);

  if (DRY_RUN) {
    console.log("\n(dry-run: nenhuma alteração gravada)");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
