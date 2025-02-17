from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer
from collections import Counter
import logging

logging.basicConfig(level=logging.INFO)
app = FastAPI()

origins = [
    "http://localhost", 
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def initialize_elasticsearch():
    try:
        es = Elasticsearch(
            "http://localhost:9200",
            basic_auth=("elastic", "WpJra7WT=knXso=Np-Bv"),
            verify_certs=False,
            request_timeout=120
        )
        if es.ping():
            return es
        else:
            raise HTTPException(status_code=500, detail="Elasticsearch bağlantısı başarısız!")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bağlantı hatası: {str(e)}")

# Redis Cache Kullanarak Arama
@app.get("/search")
def search_with_cache(search_query: str, threshold: float = 0.5, batch_size: int = 10000):
    cache_key = f"search:{search_query}"
    cached_result = redis_client.get(cache_key)

    if cached_result:
        return json.loads(cached_result)

    model = SentenceTransformer('all-mpnet-base-v2')
    vector_of_input_keyword = model.encode(search_query)

    query = {
        "field": "vector",
        "query_vector": vector_of_input_keyword,
        "k": batch_size,
        "num_candidates": 10000,
    }

    try:
        es = initialize_elasticsearch()
        res = es.knn_search(index="aerospace_index", knn=query, source=["cpc_subgroup_id", "date_published", "_score"])
        print("Elasticsearch response:", res) 
        hits = res.get("hits", {}).get("hits", [])

        filtered_hits = [doc for doc in hits if doc["_score"] >= threshold]

        redis_client.setex(cache_key, 600, json.dumps(filtered_hits))
        return filtered_hits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Arama hatası: {str(e)}")


@app.get("/top-cpc-codes")
def find_most_used_cpc_codes(search_query: str):
    hits = search_with_cache(search_query)
    try:
        cpc_codes = [code for hit in hits for code in hit["_source"].get("cpc_subgroup_id", []) if isinstance(hit["_source"].get("cpc_subgroup_id"), list)]
        cpc_counter = Counter(cpc_codes)
        print("Top 5 CPC codes:", cpc_counter.most_common(5))  
        return cpc_counter.most_common(5)  
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CPC kodlarını işlerken hata oluştu: {str(e)}")


@app.get("/yearly-cumulative-data")
def extract_yearly_cumulative_data(cpc_code: str, search_query: str):
    hits = search_with_cache(search_query)
    
    years = [int(hit["_source"].get("date_published", "").split("-")[0]) for hit in hits if cpc_code in hit["_source"].get("cpc_subgroup_id", [])]

    if years:
        years_sorted = sorted(set(years)) 
        yearly_counts = {year: years.count(year) for year in years_sorted}
        
        cumulative_years = []
        cumulative_total = 0
        for year in years_sorted:
            cumulative_total += yearly_counts[year]
            cumulative_years.append((year, cumulative_total))
            
        logging.info(f"Cumulative data for CPC code {cpc_code}: {cumulative_years}")
        
        return {"cpc_code": cpc_code, "cumulative_years": cumulative_years}
    else:
        raise HTTPException(status_code=404, detail=f"No data found for CPC code {cpc_code}")

@app.get("/yearly-data-for-top-cpc-codes")
def get_yearly_data_for_top_cpc_codes(search_query: str):
    top_cpc_codes = find_most_used_cpc_codes(search_query)
    print("Top CPC Codes:", top_cpc_codes) 

    yearly_data = {}
    for cpc_code, _ in top_cpc_codes:
        data = extract_yearly_cumulative_data(cpc_code, search_query)
        yearly_data[cpc_code] = data["cumulative_years"] 

    return yearly_data
