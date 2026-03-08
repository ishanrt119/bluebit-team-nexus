import React from 'react';
import { GitBranch } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="py-20 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <GitBranch className="text-blue-500 w-6 h-6" />
          <span className="font-bold text-lg text-white">Git History Time Traveller</span>
        </div>
        <div className="flex gap-8 text-sm text-white/40">
          <a href="#" className="hover:text-white transition-colors">GitHub</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Team</a>
        </div>
        <div className="text-sm text-white/20">
          © 2024 Git History Time Traveller. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
