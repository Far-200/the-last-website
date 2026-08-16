// src/three/elements/Particles.jsx
//
// Ambient floating dust. A single Points object with a capped count —
// not thousands of individual meshes — and drift is applied via a
// vertex shift on the buffer inside useFrame rather than per-particle
// React state.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 260;

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Particles({ reduceMotion = false }) {
  const pointsRef = useRef();

  const { positions, speeds } = useMemo(() => {
    const rand = mulberry32(99);
    const pos = new Float32Array(COUNT * 3);
    const spd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (rand() - 0.5) * 9;
      pos[i * 3 + 1] = rand() * 4;
      pos[i * 3 + 2] = (rand() - 0.5) * 7;
      spd[i] = 0.03 + rand() * 0.06;
    }
    return { positions: pos, speeds: spd };
  }, []);

  useFrame((_, delta) => {
    if (reduceMotion || !pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      if (arr[i * 3 + 1] > 4) arr[i * 3 + 1] = 0;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#3a4a4a"
        size={0.012}
        sizeAttenuation
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </points>
  );
}
