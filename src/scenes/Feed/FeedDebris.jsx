// src/scenes/Feed/FeedDebris.jsx
//
// Sparse debris scattered through the corridor depth — atmosphere only,
// not narrative content. Built once as a single instancedMesh (one draw
// call for the whole field, per the project's instancing guidance for
// repeated elements) and never updated per-frame: fully static satisfies
// "move extremely slowly or remain mostly static" at zero per-frame cost,
// and needs no reduced-motion branch since there's nothing to disable.

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Same seeded PRNG used by the Prelude's own Debris/Particles elements —
// deterministic layout, not randomized per render.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rubble now settles on the floor plane (y 0) and spreads across the full
// nave width and the full length of the route, instead of hanging in a
// cube of empty space around a camera that had no ground beneath it. It
// is what gives the floor a readable texture and a sense of scale.
const COUNT = 150;
const DEPTH_RANGE = [14, -150];
const SPREAD_X = 30;

export default function FeedDebris() {
  const meshRef = useRef(null);

  const transforms = useMemo(() => {
    const rand = mulberry32(7331);
    const dummy = new THREE.Object3D();
    return Array.from({ length: COUNT }, () => {
      // Biased away from the worn centre path: debris has been kicked to
      // the sides of a route that was walked for a long time.
      const lateral = rand() - 0.5;
      const x = Math.sign(lateral) * (1.6 + Math.abs(lateral) * SPREAD_X);
      const scale = 0.18 + rand() * 0.72;

      dummy.position.set(
        x,
        scale * 0.35,
        DEPTH_RANGE[0] + rand() * (DEPTH_RANGE[1] - DEPTH_RANGE[0]),
      );
      dummy.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.4);
      dummy.scale.set(scale, scale * 0.55, scale * (0.7 + rand() * 1.5));
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    transforms.forEach((matrix, i) => meshRef.current.setMatrixAt(i, matrix));
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  // frustumCulled disabled: instancedMesh's default bounding sphere is
  // derived from the base geometry, not the spread-out instances, so
  // culling it against the base bounds would risk the exact
  // false-invisible failure mode this pass exists to fix. 150 small boxes
  // in one draw call is cheap enough that always-drawn costs nothing.
  return (
    <instancedMesh ref={meshRef} args={[null, null, COUNT]} frustumCulled={false} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#2b322f" roughness={1} metalness={0.03} />
    </instancedMesh>
  );
}
