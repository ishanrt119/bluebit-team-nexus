import React from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <Home />
      <Footer />
    </div>
  );
}

export default App;
