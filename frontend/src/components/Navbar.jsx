import React from 'react';
import { GitBranch, Github } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GitBranch className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Git History <span className="text-blue-500">Time Traveller</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="https://github.com" className="flex items-center gap-1 hover:text-white transition-colors">
            <Github className="w-4 h-4" /> GitHub
          </a>
          <button className="bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-all font-semibold">
            Analyze Repository
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
