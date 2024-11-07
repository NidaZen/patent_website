from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from elasticsearch import Elasticsearch
import numpy as np

# Elasticsearch ve model bağlantısı
es = Elasticsearch(
    "http://54.197.19.83:9200",
    basic_auth=("elastic", "8goWA4WanJXgpMWEHcoW"),
    verify_certs=False
)
model = SentenceTransformer('all-mpnet-base-v2')

# FastAPI uygulaması
app = FastAPI()

# Arama için request modeli
class SearchRequest(BaseModel):
    query: str

@app.post("/search")
async def search_patents(request: SearchRequest):
    vector_of_input_keyword = model.encode(request.query)
    query = {
        "field": "DescriptionVector",
        "query_vector": vector_of_input_keyword,
        "k": 6,
        "num_candidates": 10000
    }
    try:
        res = es.knn_search(index="uav_patents", knn=query, source=["Title (Translated)(English)", "Abstract (Translated)(English)"])
        results = res["hits"]["hits"]
        return {"results": [{ 
            "title": result["_source"]["Title (Translated)(English)"], 
            "abstract": result["_source"]["Abstract (Translated)(English)"] 
        } for result in results]}
    except Exception as e:
        return {"error": str(e)}
