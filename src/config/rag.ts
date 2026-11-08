import "dotenv/config";

export const ragConfig = {
  knowledgeDir: process.env.KNOWLEDGE_DIR || "knowledge",
  indexFile: process.env.INDEX_FILE || "data/index.json",
  // Optional. With a Voyage AI key we use real vector embeddings (semantic search).
  // Without one we fall back to keyword search (BM25), so RAG still works out of the box.
  voyageApiKey: process.env.VOYAGE_API_KEY || "",
  voyageModel: process.env.VOYAGE_MODEL || "voyage-3.5-lite",
  chunkSize: 1200, // characters per chunk
  chunkOverlap: 200,
  topK: 5,
};
