import { ragConfig } from "../config/rag.js";

/**
 * Embeddings via Voyage AI (Anthropic's recommended embeddings provider).
 * Claude itself does not produce embeddings, so RAG pairs it with an embedding model.
 */
export const embeddingsEnabled = () => Boolean(ragConfig.voyageApiKey);

export async function embed(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
  const vectors: number[][] = [];
  const BATCH = 64;
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ragConfig.voyageApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts.slice(i, i + BATCH),
        model: ragConfig.voyageModel,
        input_type: inputType,
      }),
    });
    if (!res.ok) {
      throw new Error(`Voyage embeddings failed (${res.status}): ${await res.text()}`);
    }
    const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    json.data.sort((a, b) => a.index - b.index).forEach((d) => vectors.push(d.embedding));
  }
  return vectors;
}
