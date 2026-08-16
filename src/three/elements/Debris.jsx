// src/three/elements/Debris.jsx
//
// A small, fixed field of broken geometry scattered near the CRT's base.
// Deterministic (seeded), not randomized per-render, so the composition
// stays stable across re-renders and doesn't jitter.

import { useMemo } from "react";

// Simple seeded PRNG so layout is stable but not hand-authored piece by piece.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEBRIS_COUNT = 22;

export default function Debris({ radius = 3.2 }) {
  const pieces = useMemo(() => {
    const rand = mulberry32(1337);
    return Array.from({ length: DEBRIS_COUNT }, (_, i) => {
      const angle = rand() * Math.PI * 2;
      const dist = 1.1 + rand() * radius;
      const scale = 0.05 + rand() * 0.14;
      return {
        id: i,
        position: [Math.cos(angle) * dist, scale * 0.5, Math.sin(angle) * dist],
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
        scale,
        elongation: 0.6 + rand() * 1.8,
      };
    });
  }, [radius]);

  return (
    <group>
      {pieces.map((p) => (
        <mesh
          key={p.id}
          position={p.position}
          rotation={p.rotation}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[p.scale, p.scale * 0.4, p.scale * p.elongation]}
          />
          <meshStandardMaterial
            color="#131313"
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}
