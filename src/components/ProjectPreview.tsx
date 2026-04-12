import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  Play,
  Box,
  Layout,
  Server,
  FileText,
  CheckCircle2,
  Load            <motion.div
    key="loading"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.1 }}
    className="flex flex-col items-center gap-4 text-center"
  >
    <div className="relative">
      <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      <Code2 className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
    <p className="text-zinc-400 font-mono text-sm animate-pulse">Building project environment...</p>
  </motion.div>
                ) : simulationResult ? (
  <motion.div
    key="result"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="w-full h-full flex flex-col gap-6"
  >
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 font-mono text-sm text-zinc-400 overflow-auto max-h-[300px] shadow-inner">
      {simulationResult.split('\n').map((line, i) => (
        <div key={i} className="mb-1">
          <span className="text-emerald-500 mr-2">$</span>
          {line}
        </div>
      ))}
    </div>

    <div className="flex-1 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-zinc-900/20">
      {preview.framework === "React" || preview.projectType === "Static Website" ? (
        <>
          <Layout className="w-12 h-12 text-zinc-700 mb-4" />
          <h5 className="font-bold text-zinc-400 mb-2">Visual Output Placeholder</h5>
          <p className="text-sm text-zinc-500 max-w-xs">In a live environment, the rendered frontend would appear here.</p>
        </>
      ) : (
        <>
          <Server className="w-12 h-12 text-zinc-700 mb-4" />
          <h5 className="font-bold text-zinc-400 mb-2">Backend Service Active</h5>
          <p className="text-sm text-zinc-500 max-w-xs">The API is now listening for incoming connections on the simulated port.</p>
        </>
      )}
    </div>
  </motion.div>
) : (
  <motion.div
    key="idle"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center space-y-4"
  >
    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
      <Play className="w-8 h-8 text-zinc-700" />
    </div>
    <div>
      <h4 className="font-bold text-zinc-400">Ready to Execute</h4>
      <p className="text-sm text-zinc-500 max-w-xs mx-auto">Click the button above to simulate how this project behaves in a real environment.</p>
    </div>
  </motion.div>
)}
              </AnimatePresence >

  {/* Background Decoration */ }
  < div className = "absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.02]" style = {{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            </div >
          </div >
        </div >
      </div >
    </div >
  );
}
