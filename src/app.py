from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
import redis
import json
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer
from collections import Counter
import logging
import numpy as np
from scipy.optimize import curve_fit
import requests
from bs4 import BeautifulSoup
import re
from dotenv import load_dotenv
import os

load_dotenv()

# Hata loglarını "error.log" dosyasına yazdır
logging.basicConfig(filename="error.log", level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")

logging.basicConfig(level=logging.INFO)
app = FastAPI()

origins = [
    "http://localhost", 
    "http://localhost:3000",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Gerekirse sadece "http://localhost:3000" ekle
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(host=os.getenv("REDIS_HOST"),port=int(os.getenv("REDIS_PORT")),db=int(os.getenv("REDIS_DB")),decode_responses=True
)

def initialize_elasticsearch():
    try:
        es = Elasticsearch(
            os.getenv("ELASTICSEARCH_URL"),
            basic_auth=(os.getenv("ELASTICSEARCH_USER"), os.getenv("ELASTICSEARCH_PASSWORD")),
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

# Lojistik büyüme fonksiyonu
def logistic_growth(t, K, t_m, r):
    return K / (1 + np.exp(-r * (t - t_m)))

# FastAPI log seviyesini artır
logging.basicConfig(level=logging.DEBUG)

@app.get("/predict-s-curve")
def predict_s_curve(cpc_code: str, search_query: str, future_years: int = 20):
    try:
        print(f"API request received with: cpc_code={cpc_code}, search_query={search_query}, future_years={future_years}")

        # Geçmiş verileri getir
        data = extract_yearly_cumulative_data(cpc_code, search_query)
        cumulative_years = data.get("cumulative_years", [])

        if not cumulative_years:
            raise HTTPException(status_code=404, detail="No historical data found for prediction.")

        # Yıl ve kümülatif veriyi ayır
        years, counts = zip(*cumulative_years)
        years = np.array(years, dtype=int)
        counts = np.array(counts, dtype=int)

        if len(years) < 3:
            raise HTTPException(status_code=400, detail="Not enough data points for logistic curve fitting.")

        # Eğriyi en iyi şekilde uydur
        initial_guesses = [counts.max(), years.mean(), 0.1]
        popt, _ = curve_fit(logistic_growth, years, counts, p0=initial_guesses, maxfev=20000, bounds=(0, [np.inf, np.inf, 1]))
        K, t_m, r = popt  

        # Gelecek yılları tahmin et
        future_years_list = np.arange(years[-1] + 1, years[-1] + 1 + future_years, dtype=int)
        future_counts = logistic_growth(future_years_list, K, t_m, r)

        # 99% doygunluk seviyesini hesapla
        saturation_99 = 0.99 * K
        saturation_year = int(future_years_list[np.searchsorted(future_counts, saturation_99)])

        future_predictions = list(zip(future_years_list.tolist(), future_counts.tolist()))

        response_data = {
            "cpc_code": cpc_code,
            "historical_data": cumulative_years,
            "future_predictions": future_predictions,
            "logistic_parameters": {
                "K": float(K),
                "t_m": float(t_m),
                "r": float(r)
            },
            "99_saturation_level": float(saturation_99),
            "estimated_saturation_year": saturation_year
        }

        print("API Response:", response_data)
        return response_data

    except Exception as e:
        print(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")          
    

CPC_API_URL = "https://www.uspto.gov/web/patents/classification/cpc/html/cpc-{}.html"

def fetch_cpc_title(cpc_code):
    """
    CPC kodunun başlığını çekip sadece büyük harfli kelimeleri döndürür.
    """
    try:
        url = CPC_API_URL.format(cpc_code.replace("/", "-"))  
        response = requests.get(url)

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            title_section = soup.find("div", class_="class-title")

            if title_section:
                full_title = title_section.get_text(strip=True)
                capitalized_title = " ".join(re.findall(r'\b[A-Z]+\b', full_title))
                return capitalized_title if capitalized_title else "Title not found"
            else:
                return "Title not found"
        else:
            return "CPC not found"

    except Exception as e:
        return f"Error fetching title: {e}"


router = APIRouter()

@router.get("/cpc-title/{cpc_code}")
def get_cpc_title(cpc_code: str):
    title = fetch_cpc_title(cpc_code)
    return {"cpc_code": cpc_code, "title": title}

app.include_router(router)