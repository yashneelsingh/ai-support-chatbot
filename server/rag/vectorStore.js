import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { embeddings } from '../services/gemini.js';
import mongoose from 'mongoose';
import { Document } from "@langchain/core/documents";

/**
 * Returns a standard MongoDB Atlas Vector Search store instance.
 */
let vectorStoreInstance = null;

export const getVectorStore = () => {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new MongoDBAtlasVectorSearch(embeddings, {
      collection:   mongoose.connection.client.db().collection('doc_vectors'),
      indexName:    'vector_index',
      textKey:      'text',
      embeddingKey: 'embedding',
    });
  }
  return vectorStoreInstance;
};

/**
 * Ensures the keyword text index exists on doc_vectors for BM25-style search.
 * Should be called ONCE at server startup (not on every query).
 */
export const ensureTextIndex = async () => {
  try {
    const collection = mongoose.connection.client.db().collection('doc_vectors');
    await collection.createIndex({ text: "text" });
    console.log("Verified text index on doc_vectors");
  } catch (err) {
    console.log("Warning: Could not create text index (may already exist with different options):", err.message);
  }
};

/**
 * Custom Hybrid Retriever combining Vector Similarity + Keyword Search via RRF,
 * followed by a lightweight term-overlap reranker.
 *
 * Retrieval pipeline:
 *   1. Vector similarity search (semantic understanding)
 *   2. MongoDB $text search (exact keyword/BM25-style matching)
 *   3. Reciprocal Rank Fusion (RRF) to merge both ranked lists
 *   4. Term-overlap reranking to boost chunks containing exact query terms
 *
 * This hybrid approach ensures:
 *   - Semantic queries ("how do I return something?") are handled by vectors
 *   - Exact terms (order IDs, SKUs, product names) are caught by keyword search
 *   - RRF produces a fair merged ranking without needing score normalization
 *
 * @param {number} k - Number of final documents to return (default: 4)
 * @param {number} rrfK - RRF constant controlling rank decay (default: 60)
 */
export class HybridRerankRetriever {
  constructor(k = 4, rrfK = 60) {
    this.k = k;
    this.rrfK = rrfK;
    this._textIndexReady = false;
  }

  async getRelevantDocuments(query) {
    // 1. Vector Search — retrieves 2x candidates for better fusion coverage
    const vectorStore = getVectorStore();
    const vectorDocs = await vectorStore.similaritySearch(query, this.k * 2);

    // 2. Keyword/BM25 Search — catches exact term matches that vectors might miss
    let keywordDocs = [];
    try {
      const collection = mongoose.connection.client.db().collection('doc_vectors');
      const rawKeyword = await collection
        .find({ $text: { $search: query } })
        .project({ score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .limit(this.k * 2)
        .toArray();
        
      keywordDocs = rawKeyword.map(r => new Document({ 
        pageContent: r.text, 
        metadata: r.metadata || {} 
      }));
    } catch (e) {
      console.warn("Keyword search failed, falling back to pure vector:", e.message);
    }

    // 3. Reciprocal Rank Fusion (RRF)
    //    Formula: RRF_score(doc) = Σ 1/(rrfK + rank_i)
    //    where rank_i is the doc's position in each result list.
    //    The rrfK constant (default 60) controls how quickly lower-ranked
    //    results are discounted. Higher rrfK → more uniform weighting.
    const fusedScores = new Map();
    const docsMap = new Map();

    const processResults = (docs) => {
      docs.forEach((doc, index) => {
        const key = doc.pageContent; // Using content as unique ID for chunks
        docsMap.set(key, doc);
        const rrfScore = 1 / (this.rrfK + index + 1);
        fusedScores.set(key, (fusedScores.get(key) || 0) + rrfScore);
      });
    };

    processResults(vectorDocs);
    processResults(keywordDocs);

    let combinedDocs = Array.from(fusedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, _]) => docsMap.get(key));

    // 4. Lightweight Reranking Heuristic (Keyword Overlap)
    //    Boosts chunks that contain exact query terms (ignoring stop words < 3 chars).
    //    This is a fast proxy for cross-encoder reranking — suitable for a prototype
    //    where adding a separate cross-encoder model would add latency and complexity.
    const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    
    const rerankedDocs = combinedDocs.map(doc => {
      let overlapScore = 0;
      const content = doc.pageContent.toLowerCase();
      for (const term of queryTerms) {
        if (content.includes(term)) {
          overlapScore += 1;
        }
      }
      return { doc, score: overlapScore };
    });

    // Sort primarily by overlap score, secondarily preserving RRF order
    rerankedDocs.sort((a, b) => b.score - a.score);
    
    // Return the top K docs
    return rerankedDocs.map(item => item.doc).slice(0, this.k);
  }
}
