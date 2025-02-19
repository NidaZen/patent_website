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
  const [cpcTitles, setCpcTitles] = useState({});
  const [sCurveData, setSCurveData] = useState({});
  const [saturationLevels, setSaturationLevels] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCpcCode, setSelectedCpcCode] = useState(null);

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
    setCpcTitles({});
    setSCurveData({});
    setSaturationLevels([]);

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

      const titlePromises = cpcData.map(async ([cpcCode]) => {
        const titleData = await fetchData(`http://localhost:8000/cpc-title/${cpcCode}`);
        return { cpcCode, title: titleData.title };
      });

      const titleResults = await Promise.all(titlePromises);
      const titleMap = {};
      titleResults.forEach(({ cpcCode, title }) => {
        titleMap[cpcCode] = title;
      });
      setCpcTitles(titleMap);

      const scurvePromises = cpcData.map(async ([cpcCode]) => {
        const data = await fetchData(`http://localhost:8000/predict-s-curve?search_query=${inputQuery}&cpc_code=${cpcCode}`);
        return { cpcCode, data };
      });

      const scurveResults = await Promise.all(scurvePromises);
      const scurveData = {};
      const saturationData = {};

      scurveResults.forEach(({ cpcCode, data }) => {
        scurveData[cpcCode] = data;
        saturationData[cpcCode] = {
          saturationLevel: data["99_saturation_level"],
          saturationYear: data["estimated_saturation_year"],
        };
      });

      setSCurveData(scurveData);
      setSaturationLevels(saturationData);
      
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (cpcCode) => {
    setSelectedCpcCode(cpcCode);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedCpcCode(null);
    setModalOpen(false);
  };

  const formatDataForChart = (historicalData, futurePredictions) => {
    return [...historicalData, ...futurePredictions].map(item => ({
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
            {loading ? "Aranıyor" : "Ara"}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* S-Curve Grafikler */}
        <div className="scurve-graphs">
          {Object.keys(sCurveData).length > 0 && (
            <div>
              <h2>S-Curve Tahminleri:</h2>
              <div className="graphs-container">
                {Object.entries(sCurveData).map(([cpcCode, data], index) => (
                  <div key={index} className="graph">
                    <h3 
                      onClick={() => openModal(cpcCode)} 
                      className="cpc-title"
                    >
                      {cpcCode}
                    </h3>

                    <div className="graph-content">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={formatDataForChart(data.historical_data, data.future_predictions)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
                          <ReferenceLine y={data["99_saturation_level"]} stroke="red" strokeDasharray="3 3" strokeWidth={3} />
                          <ReferenceLine x={data["estimated_saturation_year"]} stroke="green" strokeDasharray="3 3" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Popup Modal */}
        {modalOpen && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{selectedCpcCode}</h2>
              <p>{cpcTitles[selectedCpcCode] || "Açıklama yükleniyor..."}</p>
              <button onClick={closeModal} className="close-modal">Kapat</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;
