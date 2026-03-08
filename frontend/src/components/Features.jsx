import React from 'react';
import { Search, Clock, Layout, Activity, BarChart3, Code2 } from 'lucide-react';
import { motion } from 'motion/react';

const Features = () => {
  const features = [
    { icon: <Search className="w-6 h-6" />, title: "Git Repository Parsing", desc: "Deep analysis of commit history, branches, and tags." },
    { icon: <Clock className="w-6 h-6" />, title: "Timeline Animation", desc: "Watch your repository grow and change over time." },
    { icon: <Layout className="w-6 h-6" />, title: "File Change Heatmap", desc: "Identify hotspots and frequently modified files." },
    { icon: <Activity className="w-6 h-6" />, title: "File Evolution Graph", desc: "Track how individual files change across versions." },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Contributor Activity", desc: "Visualize team impact and collaboration patterns." },
    { icon: <Code2 className="w-6 h-6" />, title: "Code Complexity", desc: "Monitor technical debt and complexity trends." },
  ];

  return (
    <section id="features" className="py-32 px-6 bg-black/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Powerful Visualizations</h2>
          <p className="text-white/50">Everything you need to understand your codebase's journey.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 bg-[#141414] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
              <p className="text-white/50 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
