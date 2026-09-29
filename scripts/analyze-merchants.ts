/**
 * Analisa os merchantKeys das transações e regras no banco.
 * Identifica possíveis duplicatas via similaridade de texto.
 *
 * Uso: npx tsx scripts/analyze-merchants.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../lib/db/connect";
import { Transaction } from "../models/Transaction";
import { MerchantCategoryRule } from "../models/MerchantCategoryRule";
import { Category } from "../models/Category";
import { normalizeDescription } from "../lib/import/normalize";

// ---------- helpers ----------

function stripNoise(key: string): string {
  return key
    .replace(/\d{2}\/\d{2}\/\d{4}/g, "")   // datas dd/mm/aaaa
    .replace(/\d{4}-\d{2}-\d{2}/g, "")      // datas yyyy-mm-dd
    .replace(/\d{2}\/\d{2}/g, "")            // mm/dd ou dd/mm
    .replace(/\bparc?\s*\d+\/\d+\b/gi, "")  // parc 1/12
    .replace(/\*+\d+\**/g, "")               // *12345*
    .replace(/\s+\d{4,}\s*/g, " ")           // números longos
    .replace(/\s+/g, " ")
    .trim();
}

/** Distância de Levenshtein simples para strings curtas. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ---------- main ----------

async function main() {
  await connectDB();

  // Todos os usuários que têm transações
  const userIds = await Transaction.distinct("userId");
  console.log(`\nUsuários encontrados: ${userIds.length}\n`);

  for (const userId of userIds) {
    console.log("=".repeat(70));
    console.log(`Usuário: ${userId}`);

    // --- 1. Todas as descrições distintas ---------------------------------
    const txs = await Transaction.find({ userId, type: { $in: ["EXPENSE", "INCOME"] } })
      .select("description")
      .lean();

    const keyMap = new Map<string, { samples: Set<string>; count: number }>();
    for (const tx of txs) {
      const key = normalizeDescription(tx.description);
      const entry = keyMap.get(key);
      if (entry) {
        entry.count++;
        if (entry.samples.size < 3) entry.samples.add(tx.description);
      } else {
        keyMap.set(key, { samples: new Set([tx.description]), count: 1 });
      }
    }

    console.log(`\nMerchantKeys distintos nas transações: ${keyMap.size}`);
    console.log(`Total de transações (receita/despesa): ${txs.length}`);

    // --- 2. Regras existentes ---------------------------------------------
    const rules = await MerchantCategoryRule.find({ userId }).lean();
    const categoryIds = rules.map((r) => r.categoryId);
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const catName = new Map(categories.map((c) => [String(c._id), c.name]));

    console.log(`Regras de comerciantes cadastradas: ${rules.length}`);

    // --- 3. Listar todos os merchantKeys (ordenado por frequência) --------
    const sorted = [...keyMap.entries()].sort((a, b) => b[1].count - a[1].count);

    console.log("\n--- Top merchantKeys por frequência ---");
    for (const [key, { samples, count }] of sorted.slice(0, 40)) {
      const rule = rules.find((r) => r.merchantKey === key);
      const cat = rule ? catName.get(String(rule.categoryId)) ?? "?" : "sem regra";
      const sampleStr = [...samples].join(" | ");
      console.log(`  [${String(count).padStart(3)}x] ${key.padEnd(45)} → ${cat}`);
      if ([...samples][0] !== key) {
        console.log(`         sample: "${sampleStr}"`);
      }
    }
    if (sorted.length > 40) {
      console.log(`  ... e mais ${sorted.length - 40} merchantKeys`);
    }

    // --- 4. Detectar possíveis duplicatas ---------------------------------
    const stripped = sorted.map(([key]) => ({ key, base: stripNoise(key) }));
    const groups: Array<string[]> = [];
    const visited = new Set<string>();

    for (let i = 0; i < stripped.length; i++) {
      if (visited.has(stripped[i].key)) continue;
      const group = [stripped[i].key];
      for (let j = i + 1; j < stripped.length; j++) {
        if (visited.has(stripped[j].key)) continue;
        const sim = similarity(stripped[i].base, stripped[j].base);
        const prefixMatch =
          stripped[i].base.length >= 6 &&
          (stripped[i].base.startsWith(stripped[j].base.slice(0, 8)) ||
           stripped[j].base.startsWith(stripped[i].base.slice(0, 8)));
        if (sim >= 0.72 || prefixMatch) {
          group.push(stripped[j].key);
          visited.add(stripped[j].key);
        }
      }
      if (group.length > 1) {
        groups.push(group);
        visited.add(stripped[i].key);
      }
    }

    if (groups.length === 0) {
      console.log("\nNenhuma duplicata provável detectada.");
    } else {
      console.log(`\n--- Possíveis duplicatas (${groups.length} grupos) ---`);
      for (const group of groups) {
        console.log("\n  Grupo:");
        for (const key of group) {
          const entry = keyMap.get(key)!;
          const rule = rules.find((r) => r.merchantKey === key);
          const cat = rule ? catName.get(String(rule.categoryId)) ?? "?" : "sem regra";
          console.log(`    • "${key}"  [${entry.count}x]  → ${cat}`);
        }
      }
    }

    // --- 5. Regras sem nenhuma transação correspondente ------------------
    const orphanRules = rules.filter((r) => !keyMap.has(r.merchantKey));
    if (orphanRules.length > 0) {
      console.log(`\n--- Regras órfãs (sem transação com esse merchantKey) ---`);
      for (const r of orphanRules) {
        console.log(`  • "${r.merchantKey}" → ${catName.get(String(r.categoryId)) ?? "?"}`);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
