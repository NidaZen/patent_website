import React, { useState } from "react";
import "../design/Home.css";
import logo from "../assets/images.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

function Home() {
  const [inputQuery, setInputQuery] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cpcCodes, setCpcCodes] = useState([]);
  const [sCurveData, setSCurveData] = useState({});
  const [saturationLevels, setSaturationLevels] = useState([]);  // Array to store saturation levels and years

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

  const handleSearch = async () => {
    setError("");
    setResults([]);
    setCpcCodes([]);
    setSCurveData({});
    setSaturationLevels([]);  // Reset the saturation levels state

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

      const fetchSCurveData = async () => {
        const scurvePromises = cpcData.slice(0, 5).map(async ([cpcCode]) => {
          const data = await fetchData(`http://localhost:8000/predict-s-curve?search_query=${inputQuery}&cpc_code=${cpcCode}`);
          return { cpcCode, data };
        });

        const scurveResults = await Promise.all(scurvePromises);
        const scurveData = {};
        const saturationData = [];

        scurveResults.forEach(({ cpcCode, data }) => {
          scurveData[cpcCode] = data;

          // Store saturation level and saturation year for each cpcCode
          saturationData.push({
            cpcCode,
            saturationLevel: data["99_saturation_level"],
            saturationYear: data["estimated_saturation_year"],
          });
        });

        setSCurveData(scurveData);
        setSaturationLevels(saturationData);  // Set the saturation levels for all CPC codes
      };

      await fetchSCurveData();
      
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDataForChart = (historicalData, futurePredictions) => {
    const combinedData = [...historicalData, ...futurePredictions];
    return combinedData.map(item => ({
      year: item[0],
      value: item[1]
    }));
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

        {/* CPC Kodları */}
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

        {/* S-Curve Verileri ve Grafikler */}
        <div className="scurve-graphs">
          {Object.keys(sCurveData).length > 0 && (
            <div>
              <h2>Gelecekle İlgili Tahmin Grafikleri:</h2>
              <div className="graphs-container">
                {Object.entries(sCurveData).map(([cpcCode, data], index) => (
                  <div key={index} className="graph">
                    <h3>{cpcCode}</h3>
                    <div className="graph-content">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={formatDataForChart(data.historical_data, data.future_predictions)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />

                          {/* Yatay Çizgi (99% Saturation Level) */}
                          <ReferenceLine 
                            y={data["99_saturation_level"]} 
                            stroke="red" 
                            strokeDasharray="3 3" 
                            strokeWidth={3} 
                          />

                          {/* Dikey Çizgi (Estimated Saturation Year) */}
                          <ReferenceLine 
                            x={data["estimated_saturation_year"]} 
                            stroke="green" 
                            strokeDasharray="3 3" 
                            strokeWidth={3} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 99% Saturation Level ve Estimated Saturation Year Bilgisi */}
                    <div style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',  // Opaklık ayarlandı
                      color: 'white',
                      padding: '10px',
                      marginTop: '10px',
                      textAlign: 'center',
                      display: 'inline-block',  // Yazıya uyumlu genişlik
                    }}>
                      <p><strong>B64C:</strong></p>
                      <p>99% Saturation Level: {data["99_saturation_level"]}</p>
                      <p>Estimated Saturation Year: {data["estimated_saturation_year"]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;
