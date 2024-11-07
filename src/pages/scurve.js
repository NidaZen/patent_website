import React from 'react';
import '../design/SCurve.css';
import logo from '../assets/images.png';
import '../design/sidebar.css';
import { FaSearch } from 'react-icons/fa';

function SCurve() {
  return (
    <div className="sidebar-container">
      {/* Left Sidebar */}
      <div className="side-bar">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <ul className="sidebar-nav-links">
          <li>Main Page</li>
          <li>Relevancy Score</li>
          <li className="sidebar-active-page">S-Curve Page</li>
        </ul>
        <ul className="sidebar-bottom-links">
          <li>Account</li>
          <li>Help</li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="s-curve-main-content">
        {/* Search Section */}
        <div className="s-curve-search-container">
          <FaSearch className="s-curve-search-icon" />
          <input type="text" placeholder="Search here..." className="s-curve-search-input" />
        </div>

        {/* Title */}
        <h1 className="s-curve-title">S-Curve</h1>

        {/* Chart Area */}
        <div className="s-curve-chart-container">
          <div className="s-curve-chart">
            <img src="path/to/your/chart-image.png" alt="Chart" className="s-curve-chart-img" />
          </div>
          <div className="s-curve-info-boxes">
            <div className="s-curve-info-box">
              <h2>Rate of Change</h2>
              <p>%27</p>
            </div>
            <div className="s-curve-info-box">
              <h2>Most Rated CPC Codes</h2>
              <p>H04W</p>
              <p>G06K</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SCurve;
