import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional

class VectorSearchManager:
    def __init__(self, faq_json_path: str = "data/faqs.json", index_path: str = "models/faq_faiss.index", emb_path: str = "models/faq_embeddings.npy"):
        self.faq_json_path = faq_json_path
        self.index_path = index_path
        self.emb_path = emb_path
        self.embedding_model = None
        self.faiss_index = None
        self.faq_data = []
        self.faq_embeddings = None
        self.last_faq_mtime = None
        self._init_all()

    def _init_all(self):
        self.load_faq_data()
        self.load_embedding_model()
        self.load_or_build_index()

    def load_faq_data(self):
        if not os.path.exists(self.faq_json_path):
            self.faq_data = []
            return
        mtime = os.path.getmtime(self.faq_json_path)
        if self.last_faq_mtime == mtime and self.faq_data:
            return
        with open(self.faq_json_path, "r", encoding="utf-8") as f:
            self.faq_data = json.load(f)
        self.last_faq_mtime = mtime

    def load_embedding_model(self):
        if self.embedding_model is None:
            self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

    def load_or_build_index(self):
        if os.path.exists(self.index_path) and os.path.exists(self.emb_path):
            self.faiss_index = faiss.read_index(self.index_path)
            self.faq_embeddings = np.load(self.emb_path)
        else:
            self.build_index()

    def build_index(self):
        if not self.faq_data:
            return
        texts = [f"{faq.get('question', '')} {' '.join(faq.get('keywords', []))}" for faq in self.faq_data]
        embeddings = self.embedding_model.encode(texts, convert_to_tensor=False)
        self.faq_embeddings = np.array(embeddings).astype('float32')
        dim = self.faq_embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatL2(dim)
        self.faiss_index.add(self.faq_embeddings)
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        faiss.write_index(self.faiss_index, self.index_path)
        np.save(self.emb_path, self.faq_embeddings)

    def check_and_rebuild(self):
        old_mtime = self.last_faq_mtime
        self.load_faq_data()
        if self.last_faq_mtime != old_mtime:
            self.build_index()

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        self.check_and_rebuild()
        if not self.faiss_index or not self.embedding_model:
            return []
        query_emb = self.embedding_model.encode([query], convert_to_tensor=False)
        query_vec = np.array(query_emb).astype('float32')
        distances, indices = self.faiss_index.search(query_vec, top_k)
        results = []
        for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < len(self.faq_data):
                faq = self.faq_data[idx].copy()
                faq['similarity_score'] = 1.0 / (1.0 + dist)
                faq['search_method'] = 'vector'
                results.append(faq)
        return results

    def keyword_fallback(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        self.load_faq_data()
        query_lower = query.lower()
        scored = []
        for faq in self.faq_data:
            score = sum(1 for kw in faq.get('keywords', []) if kw.lower() in query_lower)
            if score > 0:
                f = faq.copy()
                f['similarity_score'] = 0.3 + 0.1 * score
                f['search_method'] = 'keyword'
                scored.append(f)
        scored.sort(key=lambda x: x['similarity_score'], reverse=True)
        return scored[:top_k]

    def hybrid_search(self, query: str, context: Optional[Dict] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        vector_results = self.search(query, top_k)
        if len(vector_results) < top_k:
            keyword_results = self.keyword_fallback(query, top_k)
            ids = {f['id'] for f in vector_results}
            for f in keyword_results:
                if f['id'] not in ids:
                    vector_results.append(f)
        # Optionally, context-aware reranking can be added here
        return vector_results[:top_k] 