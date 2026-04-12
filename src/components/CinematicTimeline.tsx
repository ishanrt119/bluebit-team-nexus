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

  const loc = (commit.insertions || 0) + (commit.deletions || 0);
  // Base scale is 0.2, massive commits can go up to 3x larger
  const baseScale = Math.min(3, 0.2 + (loc / 500));
  const activeScale = Math.min(4, 0.8 + (loc / 300));

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
      if (active) {
        const s = activeScale + Math.sin(state.clock.elapsedTime * 4) * (0.05 * activeScale);
        meshRef.current.scale.set(s, s, s);
      } else {
        meshRef.current.scale.set(baseScale, baseScale, baseScale);
      }
    }
  });

  return (
    <group position={position}>
      <Float speed={5} rotationIntensity={1} floatIntensity={1}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
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
        <pointLight intensity={10} distance={10 + activeScale * 2} color={color} />
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
    { isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" /> }
            </button >
    <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
      <Maximize2 className="w-5 h-5" />
    </button>
          </div >
        </div >

    {/* Subtitles / Commit Message */ }
    < AnimatePresence mode = "wait" >
      { activeCommit && (
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

            <
      </div>
        </div>
      );
}
