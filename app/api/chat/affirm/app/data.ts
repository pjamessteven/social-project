import { QdrantVectorStore } from "@llamaindex/qdrant";
import { VectorStoreIndex } from "llamaindex";

export async function getIndex(params?: any) {
  const vectorStore = new QdrantVectorStore({
    url: "http://localhost:6333",
    collectionName: "trans",
  });

  return await VectorStoreIndex.fromVectorStore(vectorStore);
}
