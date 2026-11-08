# AI Learning Coach

An agentic AI learning coach powered by **Claude**. Tell it a goal ("I want to become an
AI Engineer in 12 months") and it plans, teaches, assesses, reviews and adapts:

1. Creates a roadmap
2. Creates weekly projects
3. Generates quizzes
4. Generates interview questions
5. Reviews submitted work and gives feedback
6. Tracks progress and recommends next steps

## Architecture

```
Angular frontend (Phase 12)
        │
Node.js + TypeScript API (Express)
        │
Coach Orchestrator  ── a Claude agent that calls the specialists as tools
   ┌────┼──────────┬───────────┬────────────┐
Roadmap Project   Quiz     Interview    Review      ← specialist agents (Claude)
        │
RAG: vector search over knowledge/ (Phase 9)   MCP tools: calendar, GitHub, progress (Phase 10)
        │
PostgreSQL via Prisma: users, projects, quizzes, submissions, progress (Phase 11)
```

- **LLM:** Claude (`claude-opus-5-5` by default, set `CLAUDE_MODEL` to change) via `@anthropic-ai/sdk`.
- **Structured outputs:** quizzes, reviews and interviews come back as JSON validated by Zod.
- **Agent workflow:** `/api/coach/chat` uses the SDK tool runner, so Claude decides which
  specialist agents to call to reach the learner's goal.

## Getting started

```bash
npm install
cp .env.example .env      # then paste your key from https://platform.claude.com
npm run dev               # http://localhost:5000
```

## API

| Method | Path | Body |
|---|---|---|
| GET | `/health` | |
| POST | `/api/coach/roadmap` | `{ "skill": "AI Engineering", "durationMonths": 12, "currentLevel": "beginner" }` |
| POST | `/api/coach/project` | `{ "learnedSoFar": "Python basics" }` |
| POST | `/api/coach/quiz` | `{ "topic": "Machine Learning", "difficulty": "beginner", "count": 10 }` |
| POST | `/api/coach/interview` | `{ "role": "AI Engineer", "level": "junior" }` |
| POST | `/api/coach/review` | `{ "submission": "<code or text>", "context": "optional assignment" }` |
| POST | `/api/coach/ask` | `{ "question": "What is the difference between RAG and fine-tuning?" }` returns an answer with citations from `knowledge/` |
| POST | `/api/coach/chat` | `{ "messages": [{ "role": "user", "content": "Teach me AI Engineering" }] }` returns `{ "reply": "..." }`. To continue, send the history back with `{ "role": "assistant", "content": reply }` appended. |

Try it:

```bash
curl -X POST localhost:5000/api/coach/quiz -H "content-type: application/json" \
  -d '{"topic":"Machine Learning","count":3}'
```

## RAG (Phase 9)

```
knowledge/*.pdf|.md|.txt ─► load ─► chunk ─► embed (Voyage AI) ─► data/index.json
question ─► embed ─► top-5 similar chunks ─► Claude answers with [1] [2] citations
```

1. Put your PDFs and notes in `knowledge/` (starter notes are included).
2. Run `npm run ingest` to build the index. Re-run it whenever you add files.
3. Ask: `POST /api/coach/ask`, or just chat. The Coach agent has a `search_knowledge_base` tool.

Claude doesn't produce embeddings, so semantic search uses **Voyage AI** (set `VOYAGE_API_KEY`
in `.env`, then re-run ingest). Without a key it falls back to keyword search (BM25), so it works
with zero setup. The store is a JSON file, which is fine for a personal library; swap it for
ChromaDB or pgvector at deploy time by reimplementing `src/vector/store.ts`.

## Build plan

- [x] Phase 1–2: TypeScript backend and folder structure
- [x] Phase 3: Claude integration
- [x] Phases 4–8: Roadmap, Project, Quiz, Interview and Review agents
- [x] Phase 13 (first version): orchestrator agent that chains the specialists
- [x] Phase 9: RAG over `knowledge/` (file vector store, Voyage AI embeddings or keyword fallback)
- [ ] Phase 10: MCP tools (calendar, GitHub, progress)
- [ ] Phase 11: Prisma + PostgreSQL progress tracking
- [ ] Phase 12: Angular dashboard and chat UI
- [ ] Phase 14: Deploy to Azure (App Service, PostgreSQL, Static Web Apps)

## Project structure

```
src/
├── agents/        roadmap, project, quiz, interview, review, knowledge, orchestrator
├── config/        env + Claude client helpers
├── controllers/   request validation + responses
├── routes/        /api/coach/*
├── services/      thin layer the controllers call
├── tools/         MCP tools (Phase 10)
├── types/         Zod schemas for structured outputs
├── scripts/       ingest.ts (builds the RAG index)
├── vector/        loader, chunker, embeddings, store
├── app.ts
└── server.ts
knowledge/         PDFs and notes for RAG; run `npm run ingest` after changes
data/              generated index (git-ignored)
```
