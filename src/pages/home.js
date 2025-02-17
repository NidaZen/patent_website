import React, { useState } from "react";
import "../design/Home.css";
import logo from "../assets/images.png";

function Home() {
  const [inputQuery, setInputQuery] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cpcCodes, setCpcCodes] = useState([]);
  const [years, setYears] = useState([]);

  const fetchData = async (url) => {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`API Hatası: ${response.status} - ${response.statusText}`);
    }
    return response.json();
  };

  // Arama fonksiyonu
const handleSearch = async () => {
  setError("");
  setResults([]);
  setCpcCodes([]);
  setYears([]);

  if (inputQuery.trim() === "") {
    setError("Lütfen bir arama terimi girin.");
    return;
  }

  setLoading(true);

  try {
    const searchData = await fetchData(`http://localhost:8000/search?search_query=${inputQuery}`);
    setResults(searchData.filtered_hits || []);

    const cpcData = await fetchData(`http://localhost:8000/top-cpc-codes?search_query=${inputQuery}`);
    setCpcCodes(cpcData); 

    const yearlyData = await fetchData(`http://localhost:8000/yearly-data-for-top-cpc-codes?search_query=${inputQuery}`);
    console.log("Yearly Data:", yearlyData);

    if (Array.isArray(yearlyData.years)) {
      setYears(yearlyData.years); 
    } else {
      setYears([]); 
      console.error("Beklenen 'years' dizisi, ancak şu veriyi aldık:", yearlyData.years);
    }
  } catch (err) {
    setError(err.message);
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="home-container">
      <header className="top-bar">
        <div className="topbar-content">
          <img src={logo} alt="Logo" className="topbar-icon" />
          <span className="topbar-logo-text">Teknoloji Olgunluk Ölçüm Aracı</span>
        </div>
      </header>

      <main className="content">
        <h1 className="content-title">Teknolojinin Geleceği Hakkında Bilgi Edinin</h1>

        <div className="search-box">
          <input
            type="text"
            placeholder="Patent ara..."
            className="search-input"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
          />
          <button className="search-button" onClick={handleSearch} disabled={loading}>
            {loading ? "Aranıyor..." : "Ara"}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* Arama sonuçları */}
        <div className="api-results">
          {results.length > 0 && (
            <div>
              <h2>Arama Sonuçları:</h2>
              <ul>
                {results.map((result, index) => (
                  <li key={index}>{JSON.stringify(result)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {}
        <div className="cpc-codes">
          {cpcCodes.length > 0 && (
            <div>
              <h2>En Çok Kullanılan CPC Kodları:</h2>
              <table className="cpc-table">
                <thead>
                  <tr>
                    <th>CPC Kodu</th>
                    <th>Kullanım Sayısı</th>
                  </tr>
                </thead>
                <tbody>
                  {cpcCodes.map(([cpcCode, count], index) => (
                    <tr key={index}>
                      <td>{cpcCode}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {}
        <div className="years-data">
          {years.length > 0 && (
            <div>
              <h2>Yıllık Veriler:</h2>
              <ul>
                {years.map((year, index) => (
                  <li key={index}>{year}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;
