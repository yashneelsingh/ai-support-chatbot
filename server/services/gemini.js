import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

// Embeddings used for vector storage + retrieval
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
  outputDimensionality: 768,
  apiKey: process.env.GEMINI_API_KEY,
});
