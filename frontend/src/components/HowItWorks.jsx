import React from 'react';
import { ArrowRight } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    { num: "01", title: "Enter URL", desc: "Paste any public GitHub repository URL into the analyzer." },
    { num: "02", title: "Parsing", desc: "Our system parses commit history, metadata, and file changes." },
    { num: "03", title: "Visualize", desc: "Explore interactive graphs and timelines of your repo's evolution." },
  ];

  return (
    <section id="how-it-works" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">How It Works</h2>
          <p className="text-white/50">Three simple steps to unlock repository insights.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-12 items-center justify-center">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 text-center relative">
              <div className="text-8xl font-black text-white/5 absolute -top-12 left-1/2 -translate-x-1/2 -z-10">{s.num}</div>
              <h3 className="text-2xl font-bold mb-4 text-white">{s.title}</h3>
              <p className="text-white/50">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 translate-x-full text-white/10">
                  <ArrowRight className="w-8 h-8" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
