# RAG Chunking Strategy

This document outlines the chunking strategy employed in our ingestion pipeline (`server/rag/ingest.js`) for the Retrieval-Augmented Generation (RAG) system.

## Parameters Used
We utilize the `RecursiveCharacterTextSplitter` from LangChain with the following parameters:
- **Chunk Size:** `1000` characters
- **Chunk Overlap:** `150` characters

## Reasoning

### 1. Chunk Size (1000 characters)
- **Context Window Efficiency:** A chunk size of 1000 characters roughly corresponds to 200-250 tokens. This is small enough to ensure that we retrieve dense, highly relevant snippets without diluting the semantic meaning.
- **LLM Context Limits:** By keeping chunks around this size, returning the top 4 chunks results in roughly 1000 tokens of retrieved context. This easily fits within the prompt window of our LLM (Gemini) while leaving plenty of room for conversation history and reasoning scratchpads.
- **Precision:** Smaller chunks result in more precise embedding vectors, meaning user queries are more likely to strongly match a specific paragraph rather than a sprawling, multi-topic page.

### 2. Chunk Overlap (150 characters)
- **Context Preservation:** Documents are split somewhat arbitrarily based on character counts or paragraphs. An overlap of 150 characters ensures that sentences or concepts spanning across the boundary between two chunks are not abruptly severed.
- **Entity Integrity:** Important terms (like product names, long SKUs, or multi-word concepts) that happen to fall exactly on a chunk boundary are preserved intact in at least one of the overlapping chunks.

## Future Tuning
If we ingest highly structured documents (like JSON product catalogs or tabulated policies), we may consider migrating from `RecursiveCharacterTextSplitter` to a more structured splitter (e.g., Markdown or HTML headers) to preserve document hierarchy alongside semantic meaning.
