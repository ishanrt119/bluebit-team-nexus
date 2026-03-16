import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, PerspectiveCamera, Stars, OrbitControls, Environment, MeshDistortMaterial, Sphere, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Clock, User, GitCommit, Volume2, VolumeX, Maximize2, Activity, FileCode, Zap, Download } from 'lucide-react';
import { Commit, cn } from '../lib/utils';
import { useThree } from '@react-three/fiber';

// --- Sound Engine ---
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.1;
  }

  playTick() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playWhoosh() {
    if (!this.ctx || !this.masterGain) return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.2);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
}

const sound = new SoundEngine();

// --- 3D Components ---

interface CommitNodeProps {
  commit: Commit;
  position: [number, number, number];
  active: boolean;
}

function CommitSphere({ commit, position, active }: CommitNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const color = useMemo(() => {
    const msg = commit.message.toLowerCase();
    if (msg.includes('fix')) return '#f43f5e';
    if (msg.includes('feat')) return '#10b981';
    if (msg.includes('refactor')) return '#3b82f6';
    return '#f59e0b';
  }, [commit.message]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
      if (active) {
        const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
        meshRef.current.scale.set(s, s, s);
      }
    }
  });

  return (
    <group position={position}>
      <Float speed={5} rotationIntensity={1} floatIntensity={1}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[active ? 0.8 : 0.2, 64, 64]} />
          <MeshDistortMaterial 
            color={color} 
            speed={active ? 3 : 1} 
            distort={active ? 0.4 : 0.2} 
            emissive={color}
            emissiveIntensity={active ? 5 : 0.5}
          />
        </mesh>
      </Float>
      
      {active && (
        <pointLight intensity={10} distance={10} color={color} />
      )}
    </group>
  );
}

interface CinematicTimelineProps {
  commits: Commit[];
}

function Scanner({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.z = index * 5;
      ref.current.rotation.z += 0.05;
      const s = 5 + Math.sin(state.clock.elapsedTime * 10) * 0.5;
      ref.current.scale.set(s, s, 1);
    }
  });

  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial color="#10b981" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function CinematicTimeline({ commits }: CinematicTimelineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const sortedCommits = useMemo(() => [...commits].reverse(), [commits]);

  const nextCommit = useCallback(() => {
    if (currentIndex < sortedCommits.length - 1) {
      setCurrentIndex(prev => prev + 1);
      if (!isMuted) sound.playTick();
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, sortedCommits.length, isMuted]);

  const prevCommit = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (!isMuted) sound.playTick();
    }
  }, [currentIndex, isMuted]);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setTimeout(nextCommit, 3000 / speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, speed, nextCommit]);

  useEffect(() => {
    if (isPlaying && !isMuted) sound.playWhoosh();
  }, [isPlaying, isMuted]);

  const activeCommit = sortedCommits[currentIndex];

  const handleTogglePlay = () => {
    sound.init();
    setIsPlaying(!isPlaying);
  };

  const startRecording = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { 
      mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm' 
    });
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repo-evolution-${new Date().getTime()}.${recorder.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      setIsRecording(false);
    };
    
    recorder.start();
    setIsRecording(true);
    
    // Record for 15 seconds or until manually stopped
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 15000);
  };

  return (
    <div className="h-[800px] w-full bg-black rounded-[3rem] border border-white/10 overflow-hidden relative group shadow-[0_0_100px_rgba(0,0,0,0.8)]">
      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={50} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
        <ambientLight intensity={0.1} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <Environment preset="night" />

        <group position={[0, 0, -currentIndex * 5]}>
          <Scanner index={currentIndex} />
          {sortedCommits.map((commit, idx) => (
            <CommitSphere 
              key={commit.sha} 
              commit={commit} 
              position={[
                Math.sin(idx * 0.5) * 4, 
                Math.cos(idx * 0.5) * 4, 
                idx * 5
              ]} 
              active={idx === currentIndex}
            />
          ))}
          
          {/* Connecting Path */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={sortedCommits.length}
                array={new Float32Array(sortedCommits.flatMap((_, idx) => [
                  Math.sin(idx * 0.5) * 4, 
                  Math.cos(idx * 0.5) * 4, 
                  idx * 5
                ]))}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#10b981" transparent opacity={0.2} linewidth={2} />
          </line>
        </group>
      </Canvas>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Vignette & Grain */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-12 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center relative z-10">
                <Activity className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Evolution.mp4</h2>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">
                  <Zap className="w-3 h-3" /> Live Playback
                </span>
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">4K Ultra HD</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={startRecording}
              disabled={isRecording}
              className={cn(
                "px-4 h-12 rounded-xl border flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-widest",
                isRecording 
                  ? "bg-rose-500 border-rose-500 text-white animate-pulse" 
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
              )}
            >
              <Download className="w-4 h-4" />
              {isRecording ? "Recording..." : "Export MP4"}
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subtitles / Commit Message */}
        <AnimatePresence mode="wait">
          {activeCommit && (
            <motion.div
              key={activeCommit.sha}
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="absolute bottom-40 left-12 right-12 text-center"
            >
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                    Sequence {currentIndex + 1} // {sortedCommits.length}
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none uppercase italic">
                  {activeCommit.message}
                </h1>

                <div className="flex items-center justify-center gap-8 text-zinc-500">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest">{activeCommit.author}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">{new Date(activeCommit.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side Info Panel */}
        <AnimatePresence>
          {showDetails && activeCommit && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="absolute left-12 top-1/2 -translate-y-1/2 w-64 space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Impact Analysis</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-4 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl">
                    <div className="text-emerald-500 font-black text-xl">+{activeCommit.insertions || 0}</div>
                    <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Additions</div>
                  </div>
                  <div className="p-4 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl">
                    <div className="text-rose-500 font-black text-xl">-{activeCommit.deletions || 0}</div>
                    <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Deletions</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Modified Files</h3>
                <div className="space-y-1">
                  {(activeCommit.modifiedFiles || []).slice(0, 5).map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-white/5 p-2 rounded-lg border border-white/5">
                      <FileCode className="w-3 h-3 text-emerald-500" />
                      <span className="truncate">{file.split('/').pop()}</span>
                    </div>
                  ))}
                  {(activeCommit.modifiedFiles || []).length > 5 && (
                    <div className="text-[8px] font-bold text-zinc-600 text-center uppercase tracking-widest pt-1">
                      + {(activeCommit.modifiedFiles || []).length - 5} more files
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Activity Log */}
        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-64 h-[400px] overflow-hidden pointer-events-auto">
          <div className="space-y-2 mb-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Activity Log</h3>
          </div>
          <div className="space-y-2 relative">
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black to-transparent z-10" />
            <div className="space-y-2 py-8">
              {sortedCommits.slice(Math.max(0, currentIndex - 5), currentIndex + 5).map((commit, i) => {
                const idx = sortedCommits.indexOf(commit);
                const isActive = idx === currentIndex;
                return (
                  <motion.div
                    key={commit.sha}
                    initial={false}
                    animate={{ 
                      opacity: isActive ? 1 : 0.3,
                      scale: isActive ? 1 : 0.9,
                      x: isActive ? 0 : 10
                    }}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer",
                      isActive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-zinc-900/30 border-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        commit.sentiment === 'positive' ? "bg-emerald-500" :
                        commit.sentiment === 'negative' ? "bg-rose-500" : "bg-zinc-500"
                      )} />
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{commit.sha.substring(0, 7)}</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-300 line-clamp-1">{commit.message}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-12 left-12 right-12 z-50 flex items-center gap-8 pointer-events-auto">
        <div className="flex-1 h-16 bg-zinc-900/80 backdrop-blur-3xl rounded-2xl border border-white/10 flex items-center px-8 gap-6 shadow-2xl">
          <div className="flex items-center gap-2">
            <button 
              onClick={prevCommit}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button 
              onClick={handleTogglePlay}
              className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 rounded-xl flex items-center justify-center text-black transition-all active:scale-90"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button 
              onClick={nextCommit}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 relative group/progress">
            <div className="absolute -top-6 left-0 right-0 flex justify-between text-[8px] font-black text-zinc-600 uppercase tracking-widest">
              <span>Start of History</span>
              <span>{Math.round(((currentIndex + 1) / sortedCommits.length) * 100)}% Complete</span>
              <span>Project Present</span>
            </div>
            <div 
              className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                const newIndex = Math.floor(percent * sortedCommits.length);
                setCurrentIndex(Math.min(sortedCommits.length - 1, Math.max(0, newIndex)));
              }}
            >
              <motion.div 
                className="h-full bg-emerald-500 relative"
                initial={false}
                animate={{ width: `${((currentIndex + 1) / sortedCommits.length) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-0 group-hover/progress:scale-100 transition-transform" />
              </motion.div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "w-10 h-8 rounded-lg text-[10px] font-black transition-all uppercase tracking-tighter",
                  speed === s ? "bg-white text-black" : "text-zinc-500 hover:bg-white/5"
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
