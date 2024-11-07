import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../design/Search.css';
import '../design/Explanation.css';

function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');         // State for search input
  const [results, setResults] = useState([]);      // State for API search results
  const [loading, setLoading] = useState(false);   // State for loading indicator
  const [error, setError] = useState(null);        // State for error handling

  // Handle click on a result box to navigate to the explanation page
  const handleBoxClick = () => {
    navigate('/explanation');
  };

  // Fetch search results from the API
  const fetchResults = async () => {
    if (!query) return; // Only fetch if there's a query
    setLoading(true);    // Set loading state to true
    setError(null);      // Reset error state

    try {
      // Replace 'YOUR_API_URL' with the actual API endpoint
      const response = await fetch(`YOUR_API_URL?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Error fetching results');
      }

      const data = await response.json();
      setResults(data.results || []);  // Assuming `data.results` holds the array of search results
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  return (
    <div className="search-container">
      <div className="search-left">
        <img src="path/to/logo.png" alt="Logo" className="logo" />
        <h1>Search for Patent Data</h1>
        <p>Got more questions? Feel free to contact us for more information.</p>

        {/* Search box with similar design to SCurve */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search here..."
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)} // Update query on input change
          />
          <button className="search-button" onClick={fetchResults}>Search Patent Data</button>
        </div>
      </div>

      {/* Right Panel: Displaying Search Results */}
      <div className="search-results">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          results.map((result, index) => (
            <div key={index} className="result-item" onClick={handleBoxClick}>
              <span>{result.title}</span>
              <span>{result.score}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Search;
