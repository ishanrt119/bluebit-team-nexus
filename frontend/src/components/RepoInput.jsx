import React, { useState } from 'react';
import { Search, ArrowRight, Play, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import AnalysisResult from './AnalysisResult.jsx';

const RepoInput = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to analyze repository');
      }
    } catch (error) {
      console.error('Error analyzing repo:', error);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/60">
          Visualize Git History <br /> Like Never Before
        </h1>
        <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
          Transform boring git logs into interactive visualizations and explore repository evolution through time.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-blue-500/20 max-w-2xl mx-auto"
      >
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
            <input
              type="text"
              placeholder="Paste GitHub Repository URL (e.g., https://github.com/user/repo)"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : (
                <>
                  Analyze Repository <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 text-white">
              <Play className="w-4 h-4 fill-current" /> View Demo
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </div>
          )}
        </div>
      </motion.div>

      {result && <AnalysisResult data={result} />}
    </div>
  );
};

export default RepoInput;
