# RAG fundamentals

Retrieval-Augmented Generation (RAG) gives a language model access to knowledge it was not trained on by retrieving relevant documents at question time and putting them in the prompt.

## Pipeline
1. **Ingest**: load source documents (PDFs, web pages, notes).
2. **Chunk**: split documents into passages, typically 500 to 1500 characters, with some overlap so ideas that cross a boundary are not lost.
3. **Embed**: turn each chunk into a vector with an embedding model. Similar meanings produce vectors that point in similar directions.
4. **Store**: save vectors in a vector database such as ChromaDB, pgvector, Pinecone or a simple file index.
5. **Retrieve**: embed the user's question and find the nearest chunks, usually by cosine similarity. Keyword search such as BM25 can be combined with vectors ("hybrid search").
6. **Generate**: give the retrieved chunks to the LLM with instructions to answer from them and cite sources.

## RAG vs fine-tuning
- RAG adds *knowledge* that can change daily, and supports citations. Updating it means re-ingesting documents.
- Fine-tuning changes the model's *behaviour or style* by training on examples. It is slower and costlier to update, and it does not reliably teach new facts.
- Most production assistants start with RAG and prompt engineering; fine-tuning is used later, for narrow tasks.

## Evaluating RAG
- **Retrieval quality**: does the right chunk appear in the top k results? Measure recall@k on a set of test questions.
- **Faithfulness**: is every claim in the answer supported by the retrieved sources?
- **Answer relevance**: does the answer address the question?
Common fixes: better chunking, adding metadata filters, hybrid search, re-ranking the top results.
