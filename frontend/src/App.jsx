import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import RepoDashboard from './pages/RepoDashboard.jsx';
import Footer from './components/Footer.jsx';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/repo" element={<RepoDashboard />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
