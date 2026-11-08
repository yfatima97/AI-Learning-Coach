/**
 * Build the knowledge index:  npm run ingest
 * Reads every PDF / .md / .txt in knowledge/, splits it into chunks,
 * embeds them (if VOYAGE_API_KEY is set) and saves data/index.json.
 */
import { ragConfig } from "../config/rag.js";
import { loadDocuments } from "../vector/loader.js";
import { chunkText } from "../vector/chunker.js";
import { embed, embeddingsEnabled } from "../vector/embeddings.js";
import { saveIndex } from "../vector/store.js";
import type { Chunk } from "../vector/types.js";

const pages = await loadDocuments(ragConfig.knowledgeDir);
if (pages.length === 0) {
  console.log(`No .pdf, .md or .txt files found in ${ragConfig.knowledgeDir}/`);
  process.exit(1);
}

const chunks: Chunk[] = [];
for (const p of pages) {
  chunkText(p.text, ragConfig.chunkSize, ragConfig.chunkOverlap).forEach((text, i) => {
    chunks.push({ id: `${p.source}${p.page ? `#p${p.page}` : ""}-${i}`, source: p.source, page: p.page, text });
  });
}
const files = new Set(pages.map((p) => p.source)).size;
console.log(`Loaded ${files} file(s), ${pages.length} page(s) -> ${chunks.length} chunks`);

const useVectors = embeddingsEnabled();
if (useVectors) {
  console.log(`Embedding with ${ragConfig.voyageModel}...`);
  const vectors = await embed(chunks.map((c) => c.text), "document");
  chunks.forEach((c, i) => (c.embedding = vectors[i]));
} else {
  console.log("No VOYAGE_API_KEY set: using keyword search (add a key later for semantic search).");
}

await saveIndex({
  createdAt: new Date().toISOString(),
  mode: useVectors ? "vector" : "keyword",
  embeddingModel: useVectors ? ragConfig.voyageModel : undefined,
  chunks,
});
console.log(`Saved ${ragConfig.indexFile}`);
