# Embeddings explained

An embedding is a list of numbers (a vector) that represents the meaning of a piece of text. Texts with similar meaning get vectors that are close together, so "How do I reset my password?" and "I forgot my login" end up near each other even though they share few words.

- **Dimensions**: modern embedding models output vectors with hundreds to a few thousand numbers.
- **Cosine similarity**: the usual way to compare two embeddings; 1 means the same direction (very similar), 0 means unrelated.
- **Uses**: semantic search, RAG retrieval, clustering, recommendations, duplicate detection.
- **Query vs document embeddings**: some models, such as Voyage AI's, embed questions and documents slightly differently to improve retrieval; pass the right input type.
- Claude does not produce embeddings itself; applications pair Claude with an embedding model such as Voyage AI.
