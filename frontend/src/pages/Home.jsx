import React from 'react';
import Navbar from '../components/Navbar.jsx';
import RepoInput from '../components/RepoInput.jsx';
import Features from '../components/Features.jsx';
import HowItWorks from '../components/HowItWorks.jsx';

const Home = () => {
  return (
    <>
      <Navbar />
      <main>
        <section className="relative pt-20 pb-32 px-6 overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
          <RepoInput />
        </section>
        <Features />
        <HowItWorks />
      </main>
    </>
  );
};

export default Home;
