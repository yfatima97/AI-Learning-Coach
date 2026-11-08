import { askClaude } from "../config/claude.js";
import { search } from "../vector/store.js";
import type { SearchResult } from "../vector/types.js";

const label = (r: SearchResult) => `${r.chunk.source}${r.chunk.page ? `, p.${r.chunk.page}` : ""}`;

/** Format retrieved chunks as numbered sources for a prompt or tool result. */
export function formatSources(results: SearchResult[]) {
  return results.map((r, i) => `<source id="${i + 1}" ref="${label(r)}">\n${r.chunk.text}\n</source>`).join("\n\n");
}

const SYSTEM = `You are an AI Learning Coach answering from the learner's own study materials.
Answer using the provided sources. Cite them inline like [1] or [2].
If the sources don't cover the question, say so plainly, then give a brief general answer marked "(general knowledge)".`;

export class KnowledgeAgent {
  /** RAG: retrieve relevant chunks, then have Claude answer grounded in them. */
  static async ask(question: string) {
    const results = await search(question);
    if (results.length === 0) {
      return {
        answer: "I couldn't find anything about that in your knowledge base. Add files to knowledge/ and run `npm run ingest`.",
        sources: [],
      };
    }
    const answer = await askClaude(SYSTEM, `${formatSources(results)}\n\nQuestion: ${question}`);
    return {
      answer,
      sources: results.map((r, i) => ({ id: i + 1, ref: label(r), score: Number(r.score.toFixed(3)) })),
    };
  }
}
