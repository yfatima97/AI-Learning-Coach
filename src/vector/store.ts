import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ragConfig } from "../config/rag.js";
import { embed, embeddingsEnabled } from "./embeddings.js";
import type { Chunk, KnowledgeIndex, SearchResult } from "./types.js";

/**
 * A small file-based vector store: chunks (and their embeddings) live in one
 * JSON file. Plenty for a personal knowledge base of a few hundred pages, and
 * easy to swap for ChromaDB or pgvector at deploy time (Phase 14) since the rest
 * of the app only calls saveIndex() and search().
 */
let cache: KnowledgeIndex | null = null;

export async function saveIndex(index: KnowledgeIndex) {
  await mkdir(path.dirname(ragConfig.indexFile), { recursive: true });
  await writeFile(ragConfig.indexFile, JSON.stringify(index));
  cache = index;
}

export async function loadIndex(): Promise<KnowledgeIndex | null> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(ragConfig.indexFile, "utf8")) as KnowledgeIndex;
    return cache;
  } catch {
    return null;
  }
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** Keyword relevance (BM25), used when no embedding key is configured. */
function bm25(query: string, chunks: Chunk[]): number[] {
  const k1 = 1.5, b = 0.75;
  const docs = chunks.map((c) => tokenize(c.text));
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
  const terms = [...new Set(tokenize(query))];
  const df = new Map(terms.map((t) => [t, docs.filter((d) => d.includes(t)).length]));

  return docs.map((doc) => {
    let score = 0;
    for (const t of terms) {
      const tf = doc.filter((w) => w === t).length;
      if (!tf) continue;
      const idf = Math.log(1 + (docs.length - df.get(t)! + 0.5) / (df.get(t)! + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / avgLen)));
    }
    return score;
  });
}

export async function search(query: string, topK = ragConfig.topK): Promise<SearchResult[]> {
  const index = await loadIndex();
  if (!index || index.chunks.length === 0) return [];

  let scores: number[];
  if (index.mode === "vector" && embeddingsEnabled()) {
    const [q] = await embed([query], "query");
    scores = index.chunks.map((c) => (c.embedding ? cosine(q, c.embedding) : 0));
  } else {
    scores = bm25(query, index.chunks);
  }

  return index.chunks
    .map((chunk, i) => ({ chunk, score: scores[i] }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
