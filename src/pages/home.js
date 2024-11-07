import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../design/Home.css';
import '../design/topbar.css';
import image from '../assets/images.png';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="top-bar">
        <div className="topbar-content">
          <div className="topbar-logo">
            <img src={image} alt="TUSAŞ Logo" className="topbar-icon" /> {/* İkon yerine resim kullanıyoruz */}
            <span className="topbar-logo-text">TUSAŞ Patent Otomasyonu</span>
          </div>
          <div className="topbar-language-options">
            <span className="topbar-language">EN</span>
            <span className="topbar-language">|</span>
            <span className="topbar-language">TR</span>
          </div>
        </div>
      </div>
      <h1 className="home-title">The easiest way to learn about the future of technology</h1>
      <div className="home-button-container">
        <button className="home-nav-button" onClick={() => navigate('/search')}>Relevancy Score</button>
        <button className="home-nav-button" onClick={() => navigate('/s-curve')}>S-CURVE</button>
      </div>
      <div className="half-circle-container">
        <p className="home-description">
          Become a pioneer in the industry by learning about the latest in technology.
        </p>
      </div>
    </div>
  );
}

export default Home;
