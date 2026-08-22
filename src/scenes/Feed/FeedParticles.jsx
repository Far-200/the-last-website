// src/scenes/Feed/FeedParticles.jsx
//
// Ambient drifting particulate, sized to the Feed's actual corridor depth
// (roughly z +9 to -35) rather than reused as-is from Prelude's Particles
// element, which is authored for that scene's much smaller CRT-room
// scale and would leave most of the Feed's route with no dust at all.
// Same technique as Prelude's Particles.jsx (a single Points buffer,
// drift applied directly to the position attribute in useFrame, no
// per-particle React state or per-frame allocation) — reused pattern,
// not a new one.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNT = 340;
const Z_RANGE = [14, -150];
const DRIFT_SPAN = 14; // vertical distance a particle travels before wrapping

export default function FeedParticles({ reduceMotion = false }) {
  const pointsRef = useRef(null);

  const { positions, speeds, baseY } = useMemo(() => {
    const rand = mulberry32(4242);
    const pos = new Float32Array(COUNT * 3);
    const spd = new Float32Array(COUNT);
    const base = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const y = rand() * DRIFT_SPAN;
      pos[i * 3] = (rand() - 0.5) * 26;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Z_RANGE[0] + rand() * (Z_RANGE[1] - Z_RANGE[0]);
      spd[i] = 0.015 + rand() * 0.03;
      base[i] = 0;
    }
    return { positions: pos, speeds: spd, baseY: base };
  }, []);

  useFrame((_, delta) => {
    if (reduceMotion || !pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      if (arr[i * 3 + 1] > baseY[i] + DRIFT_SPAN) arr[i * 3 + 1] = baseY[i];
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#5b6b66" size={0.03} sizeAttenuation transparent opacity={0.34} depthWrite={false} />
    </points>
  );
}
