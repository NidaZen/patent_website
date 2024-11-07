import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/home';
import SCurve from './pages/scurve';
import Search from './pages/search';
import Explanation from './pages/explanation';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />   
        <Route path="/s-curve" element={<SCurve />} />
        <Route path="/search" element={<Search />} />
        <Route path="/explanation" element={<Explanation />} />
      </Routes>
    </Router>
  );
}

export default App;
