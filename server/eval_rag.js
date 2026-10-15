import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectMongo } from './services/mongo.js';
import { getVectorStore, HybridRerankRetriever } from './rag/vectorStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * EVALUATION DATASET — 30 sample queries with expected source documents.
 *
 * Categories covered:
 *  - Return/refund policies
 *  - Shipping & delivery
 *  - Product specs & manuals
 *  - Edge cases (SKUs, negations, multi-word product names)
 *
 * Update 'expectedSource' values to match your actual ingested filenames.
 */
const evalSet = [
  // ── Policies ──────────────────────────────────────────────────────────────
  { query: "What is your return policy for open-box electronics?", expectedSource: "policies.pdf" },
  { query: "Can I cancel my order before it ships?", expectedSource: "policies.pdf" },
  { query: "Do you offer a warranty on monitors?", expectedSource: "policies.pdf" },
  { query: "Can I use two promo codes on one order?", expectedSource: "policies.pdf" },
  { query: "Do you accept PayPal for payment?", expectedSource: "policies.pdf" },
  { query: "Do you offer price matching?", expectedSource: "policies.pdf" },
  { query: "What is the return window for clothing?", expectedSource: "policies.pdf" },
  { query: "Are refunds issued as store credit or to the original payment method?", expectedSource: "policies.pdf" },

  // ── Shipping ──────────────────────────────────────────────────────────────
  { query: "Do you offer international shipping to Europe?", expectedSource: "shipping_faq.pdf" },
  { query: "What happens if my package is lost in transit?", expectedSource: "shipping_faq.pdf" },
  { query: "How long does ground shipping take?", expectedSource: "shipping_faq.pdf" },
  { query: "Is expedited shipping available for P.O. boxes?", expectedSource: "shipping_faq.pdf" },
  { query: "How do I track my order?", expectedSource: "shipping_faq.pdf" },
  { query: "What carriers do you use for domestic shipments?", expectedSource: "shipping_faq.pdf" },

  // ── Product Specs ─────────────────────────────────────────────────────────
  { query: "Is the wireless mouse compatible with Mac?", expectedSource: "product_specs.pdf" },
  { query: "What are the dimensions of the standing desk?", expectedSource: "product_specs.pdf" },
  { query: "What is the battery life of the bluetooth speaker?", expectedSource: "product_specs.pdf" },
  { query: "Are the running shoes true to size?", expectedSource: "product_specs.pdf" },
  { query: "What is the material of the winter jacket?", expectedSource: "product_specs.pdf" },
  { query: "What is the wattage of the USB-C Fast Charger 65W?", expectedSource: "product_specs.pdf" },

  // ── Manuals ───────────────────────────────────────────────────────────────
  { query: "How do I assemble the ergonomic office chair?", expectedSource: "chair_manual.pdf" },
  { query: "How do I clean the mechanical keyboard?", expectedSource: "keyboard_manual.pdf" },
  { query: "How do I factory reset my earbuds?", expectedSource: "earbuds_manual.pdf" },

  // ── Edge Cases: exact terms, SKUs, negations, multi-word products ────────
  { query: "SKU BT-EARBUD-001 compatibility list", expectedSource: "product_specs.pdf" },
  { query: "Mechanical Keyboard RGB key switch type", expectedSource: "product_specs.pdf" },
  { query: "Which items are NOT eligible for return?", expectedSource: "policies.pdf" },
  { query: "Does the 27 inch 4K IPS Monitor support VESA mounting?", expectedSource: "product_specs.pdf" },
  { query: "Insulated Hiking Backpack 40L waterproof rating", expectedSource: "product_specs.pdf" },
  { query: "Vitamin C Brightening Serum ingredients list", expectedSource: "product_specs.pdf" },
  { query: "What is the noise cancellation level of the earbuds in decibels?", expectedSource: "product_specs.pdf" },
];

/**
 * Compute Precision@K: of the top-K retrieved docs,
 * how many are from the expected source?
 */
function precisionAtK(retrievedSources, expectedSource, k) {
  const topK = retrievedSources.slice(0, k);
  const hits = topK.filter(s => s === expectedSource).length;
  return hits / k;
}

/**
 * Main evaluation function.
 * Compares pure vector search vs hybrid+rerank on recall@4 and precision@4.
 * Optionally evaluates faithfulness via LLM if --faithfulness flag is passed.
 */
async function runEval() {
  await connectMongo();
  
  const vectorStore = getVectorStore();
  const hybridRetriever = new HybridRerankRetriever(4);
  const checkFaithfulness = process.argv.includes('--faithfulness');

  console.log(`\n=== Starting RAG Evaluation on ${evalSet.length} queries ===`);
  if (checkFaithfulness) {
    console.log(`   (Faithfulness check enabled — will call Gemini for each query)`);
  }
  console.log();

  let vectorHits = 0, hybridHits = 0;
  let vectorPrecisionSum = 0, hybridPrecisionSum = 0;
  const results = [];

  for (let i = 0; i < evalSet.length; i++) {
    const { query, expectedSource } = evalSet[i];
    
    // 1. Pure Vector Search
    const vectorDocs = await vectorStore.similaritySearch(query, 4);
    const vectorSources = vectorDocs.map(d => d.metadata?.source || 'unknown');
    const vectorHit = vectorSources.includes(expectedSource);
    if (vectorHit) vectorHits++;
    const vectorPrec = precisionAtK(vectorSources, expectedSource, 4);
    vectorPrecisionSum += vectorPrec;

    // 2. Hybrid + Rerank
    const hybridDocs = await hybridRetriever.getRelevantDocuments(query);
    const hybridSources = hybridDocs.map(d => d.metadata?.source || 'unknown');
    const hybridHit = hybridSources.includes(expectedSource);
    if (hybridHit) hybridHits++;
    const hybridPrec = precisionAtK(hybridSources, expectedSource, 4);
    hybridPrecisionSum += hybridPrec;

    // 3. Optional Faithfulness Check (lightweight LLM-as-judge)
    let faithfulness = null;
    if (checkFaithfulness && hybridDocs.length > 0) {
      try {
        const { llm } = await import('./services/gemini.js');
        const context = hybridDocs.map(d => d.pageContent).join('\n---\n');
        const faithPrompt = `Given the following retrieved context and user query, answer ONLY "yes" or "no":
Does the context contain information that is relevant to answering the query?

Query: "${query}"

Context:
${context}

Answer (yes/no):`;
        const response = await llm.invoke(faithPrompt);
        faithfulness = response.content?.toLowerCase().includes('yes') ? 'relevant' : 'not_relevant';
      } catch (err) {
        faithfulness = 'error';
      }
    }

    const result = {
      queryIndex: i + 1,
      query,
      expectedSource,
      vector: { hit: vectorHit, sources: [...new Set(vectorSources)], precision: vectorPrec },
      hybrid: { hit: hybridHit, sources: [...new Set(hybridSources)], precision: hybridPrec },
      ...(faithfulness && { faithfulness }),
    };
    results.push(result);

    console.log(`[Q${i+1}] "${query}"`);
    console.log(`  Expected: ${expectedSource}`);
    console.log(`  Vector Only:   ${vectorHit ? '✅ HIT' : '❌ MISS'} | P@4: ${(vectorPrec * 100).toFixed(0)}% | (${[...new Set(vectorSources)].join(', ') || 'None'})`);
    console.log(`  Hybrid+Rerank: ${hybridHit ? '✅ HIT' : '❌ MISS'} | P@4: ${(hybridPrec * 100).toFixed(0)}% | (${[...new Set(hybridSources)].join(', ') || 'None'})`);
    if (faithfulness) console.log(`  Faithfulness:  ${faithfulness === 'relevant' ? '✅' : '⚠️'} ${faithfulness}`);
    console.log('----------------------------------------------------');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const n = evalSet.length;
  const summary = {
    totalQueries: n,
    vectorOnly: {
      recall_at_4: `${((vectorHits / n) * 100).toFixed(1)}%`,
      precision_at_4: `${((vectorPrecisionSum / n) * 100).toFixed(1)}%`,
      hits: vectorHits,
    },
    hybridRerank: {
      recall_at_4: `${((hybridHits / n) * 100).toFixed(1)}%`,
      precision_at_4: `${((hybridPrecisionSum / n) * 100).toFixed(1)}%`,
      hits: hybridHits,
    },
    improvement: {
      recall_delta: `${(((hybridHits - vectorHits) / n) * 100).toFixed(1)}%`,
      precision_delta: `${(((hybridPrecisionSum - vectorPrecisionSum) / n) * 100).toFixed(1)}%`,
    },
  };

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  EVALUATION RESULTS`);
  console.log(`${'═'.repeat(55)}`);
  console.log(`  Total Queries:            ${n}`);
  console.log(`  Vector Only  — Recall@4:  ${summary.vectorOnly.recall_at_4}  | Precision@4: ${summary.vectorOnly.precision_at_4}`);
  console.log(`  Hybrid+Rerank — Recall@4: ${summary.hybridRerank.recall_at_4}  | Precision@4: ${summary.hybridRerank.precision_at_4}`);
  console.log(`  Improvement   — Recall:   ${summary.improvement.recall_delta} | Precision:   ${summary.improvement.precision_delta}`);
  console.log(`${'═'.repeat(55)}`);
  console.log(`  Note: If all are MISS, ensure you have ingested documents`);
  console.log(`  with metadata.source matching the expectedSource names.`);
  console.log(`${'═'.repeat(55)}\n`);

  // ── Write results to JSON for project report ──────────────────────────────
  const outputPath = path.join(__dirname, 'eval_results.json');
  const output = { runDate: new Date().toISOString(), summary, results };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Full results written to: ${outputPath}\n`);

  process.exit(0);
}

runEval().catch(err => {
  console.error("Evaluation failed:", err);
  process.exit(1);
});
