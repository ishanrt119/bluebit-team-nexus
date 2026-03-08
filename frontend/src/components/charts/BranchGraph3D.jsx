import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const BranchGraph3D = ({ commits }) => {
  const containerRef = useRef();
  const [selectedCommit, setSelectedCommit] = useState(null);

  useEffect(() => {
    if (!commits || commits.length === 0) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const width = containerRef.current.clientWidth;
    const height = 600;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(40, 40, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x10b981, 1.5);
    pointLight.position.set(20, 50, 20);
    scene.add(pointLight);

    const blueLight = new THREE.PointLight(0x38bdf8, 1);
    blueLight.position.set(-20, -20, -20);
    scene.add(blueLight);

    // Central Axis (Time Line)
    const axisGeometry = new THREE.CylinderGeometry(0.05, 0.05, 100, 8);
    const axisMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x10b981, 
      transparent: true, 
      opacity: 0.2 
    });
    const axis = new THREE.Mesh(axisGeometry, axisMaterial);
    scene.add(axis);

    // Add a glow effect to the axis
    const glowGeometry = new THREE.CylinderGeometry(0.3, 0.3, 100, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.05
    });
    const glowAxis = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowAxis);

    // Create commit nodes
    const nodes = [];
    const sortedCommits = [...commits].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Helper for color based on author
    const authorColors = {};
    const getAuthorColor = (author) => {
      if (!authorColors[author]) {
        const colors = [0x10b981, 0x38bdf8, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899];
        authorColors[author] = colors[Object.keys(authorColors).length % colors.length];
      }
      return authorColors[author];
    };

    sortedCommits.forEach((commit, i) => {
      const angle = i * 0.4;
      const radius = 10;
      const x = Math.cos(angle) * radius;
      const y = (i / sortedCommits.length) * 80 - 40; // Spread over 80 units vertically
      const z = Math.sin(angle) * radius;

      // Size based on impact
      const impact = Math.log10((commit.additions + commit.deletions) || 1) + 0.5;
      const size = Math.min(Math.max(impact * 0.5, 0.3), 2);
      
      const nodeGeometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshPhongMaterial({ 
        color: getAuthorColor(commit.author),
        emissive: getAuthorColor(commit.author),
        emissiveIntensity: 0.2,
        shininess: 100
      });
      
      const node = new THREE.Mesh(nodeGeometry, material);
      node.position.set(x, y, z);
      node.userData = commit;
      scene.add(node);
      nodes.push(node);

      // Connect to previous commit
      if (i > 0) {
        const prevNode = nodes[i - 1];
        const points = [prevNode.position, node.position];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x334155, 
          transparent: true, 
          opacity: 0.4 
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
      }

      // Add "Time Ring" for every 10th commit or year change
      if (i % 20 === 0) {
        const ringGeo = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 64);
        const ringMat = new THREE.MeshBasicMaterial({ 
          color: 0x1e293b, 
          side: THREE.DoubleSide, 
          transparent: true, 
          opacity: 0.1 
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        scene.add(ring);
      }
    });

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes);
      if (intersects.length > 0) {
        setSelectedCommit(intersects[0].object.userData);
        
        // Move camera to look at node
        const targetPos = intersects[0].object.position;
        // We don't want to jump instantly, but we can update controls target
        controls.target.lerp(targetPos, 0.1);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Subtle rotation
      scene.rotation.y += 0.0005;
      
      // Raycasting for hover effects
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes);
      
      nodes.forEach(node => {
        const baseScale = 1;
        node.scale.lerp(new THREE.Vector3(baseScale, baseScale, baseScale), 0.1);
      });

      if (intersects.length > 0) {
        intersects[0].object.scale.lerp(new THREE.Vector3(2, 2, 2), 0.2);
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [commits]);

  return (
    <div className="relative w-full h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={containerRef} className="w-full h-full"></div>
      
      <div className="absolute top-6 left-6 pointer-events-none">
        <h4 className="text-white font-bold text-lg tracking-tight">Repository Time Helix</h4>
        <p className="text-slate-400 text-xs mt-1">Vertical axis represents time (Oldest at bottom, Newest at top).</p>
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Commits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Timeline</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-3 rounded-xl">
          <p className="text-[10px] text-slate-400 font-medium">Controls</p>
          <p className="text-[10px] text-white mt-1">Left Click: Rotate • Right Click: Pan • Scroll: Zoom</p>
        </div>
      </div>

      {selectedCommit && (
        <div className="absolute top-6 right-6 bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 p-5 rounded-2xl w-80 shadow-2xl animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                {selectedCommit.hash.substring(0, 7)}
              </span>
              <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-widest">{selectedCommit.date}</p>
            </div>
            <button 
              onClick={() => setSelectedCommit(null)} 
              className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              ×
            </button>
          </div>
          
          <h5 className="text-sm text-white font-bold mb-3 leading-snug line-clamp-3">{selectedCommit.message}</h5>
          
          <div className="flex items-center gap-3 mb-4 p-2 bg-slate-800/50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
              {selectedCommit.author.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-white font-bold">{selectedCommit.author}</p>
              <p className="text-[10px] text-slate-500">{selectedCommit.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-center">
              <span className="block text-[10px] text-emerald-500/60 font-bold uppercase mb-1">Additions</span>
              <span className="text-lg font-bold text-emerald-400">+{selectedCommit.additions}</span>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-center">
              <span className="block text-[10px] text-rose-500/60 font-bold uppercase mb-1">Deletions</span>
              <span className="text-lg font-bold text-rose-400">-{selectedCommit.deletions}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
            <p className="text-[10px] text-slate-500 font-medium italic">
              {selectedCommit.files?.length || 0} files changed
            </p>
            <button 
              onClick={() => {
                console.log(`Viewing details for commit: ${selectedCommit.hash}`);
              }}
              className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-full font-bold hover:bg-emerald-400 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchGraph3D;
