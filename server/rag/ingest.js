import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getVectorStore } from './vectorStore.js';
import PDFParse from 'pdf-parse';
import crypto from 'crypto';

/**
 * Ingests a document into the MongoDB Atlas Vector Search index.
 *
 * Pipeline:
 *   1. Fetch the document from Cloudinary (or any URL)
 *   2. Extract raw text from the PDF
 *   3. Split into overlapping chunks using RecursiveCharacterTextSplitter
 *   4. Generate embeddings and store in MongoDB Atlas
 *
 * ─── Why RecursiveCharacterTextSplitter? ─────────────────────────────────
 * We chose RecursiveCharacterTextSplitter over simpler alternatives because:
 *  - It recursively tries multiple separators (\n\n, \n, space, character)
 *    so it naturally respects paragraph and sentence boundaries when possible.
 *  - For our mix of policy docs, FAQs, and product specs, paragraph-aware
 *    splitting preserves semantic coherence far better than a naive
 *    fixed-character splitter.
 *  - Alternatives considered:
 *    • MarkdownTextSplitter — unsuitable since our source docs are PDFs, not .md
 *    • TokenTextSplitter — would give more precise token counts but loses the
 *      hierarchical separator logic that keeps paragraphs intact
 *    • Custom splitters (e.g., by heading) — would require structured input;
 *      our PDFs have inconsistent formatting
 *
 * @param {string} fileUrl   - Cloudinary URL of the uploaded file
 * @param {string} fileName  - Original file name (used as metadata source)
 * @returns {number}         - Number of chunks stored
 */
export const ingestDocument = async (fileUrl, fileName) => {
  // 1. Fetch file buffer from Cloudinary
  const res = await fetch(fileUrl);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Extract raw text from PDF
  //    TODO: extend this to handle .txt and .docx files
  const { text } = await PDFParse(buffer);

  if (!text?.trim()) throw new Error('No extractable text found in document');

  // 3. Split into overlapping chunks
  //
  // ─── Parameter Rationale ──────────────────────────────────────────────
  //
  // chunkSize: 1000 characters (~200-250 tokens)
  //   • Keeps retrieved context tight and semantically focused.
  //   • Returning top-4 chunks yields ~1000 tokens — well within Gemini's
  //     context window while leaving room for conversation history and
  //     the agent's reasoning scratchpad.
  //   • Smaller chunks produce more precise embedding vectors, improving
  //     the chance of strong semantic match on specific questions.
  //
  // chunkOverlap: 150 characters
  //   • Prevents losing context at chunk boundaries — sentences or entities
  //     (like product names, SKUs, multi-word terms) that span a boundary
  //     are preserved intact in at least one overlapping chunk.
  //   • 15% overlap ratio is a well-tested default; going higher wastes
  //     storage and embedding compute without significant retrieval gains.
  //
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize:    1000,
    chunkOverlap: 150,
  });

  const docs = await splitter.createDocuments(
    [text],
    [{ source: fileName }]  // metadata attached to each chunk
  );

  // 4. Add a unique chunkId to each document's metadata.
  //    This is a SHA-256 hash of the chunk content, enabling:
  //    - Deduplication: skip re-embedding if the same chunk already exists
  //    - Eval harness: match retrieved chunks to expected document IDs
  //    - Traceability: link audit log entries to specific chunks
  for (const doc of docs) {
    doc.metadata.chunkId = crypto
      .createHash('sha256')
      .update(doc.pageContent)
      .digest('hex')
      .slice(0, 16); // 16-char hex prefix is sufficient for uniqueness
  }

  // 5. Embed and store all chunks in MongoDB Atlas Vector Search
  const vectorStore = getVectorStore();
  await vectorStore.addDocuments(docs);

  console.log(`Ingested ${docs.length} chunks from "${fileName}"`);
  return docs.length;
};
