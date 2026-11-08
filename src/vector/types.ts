export interface Chunk {
  id: string;
  source: string; // file name
  page?: number; // PDF page, 1-based
  text: string;
  embedding?: number[];
}

export interface KnowledgeIndex {
  createdAt: string;
  mode: "vector" | "keyword";
  embeddingModel?: string;
  chunks: Chunk[];
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
}
