// src/scenes/Prelude/PreludeScene.jsx
//
// The Three.js layer of the Prelude: fixed cinematic camera, restrained
// lighting, fog for depth, a rough ground plane, the CRT, debris, and
// ambient dust. No OrbitControls — this is an authored view.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import CRTTerminal from "../../three/elements/CRTTerminal";
import Debris from "../../three/elements/Debris";
import Particles from "../../three/elements/Particles";

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#050505" roughness={0.85} metalness={0.35} />
    </mesh>
  );
}

// Ambient light intensities per narrative depth. SIGNAL keeps the
// machine barely present in the darkness; SYSTEM brings it up as the
// visual source of the reconstruction; ARCHIVE/LEAVING ease back down
// as the composition hands weight to the recovered document.
const AMBIENT_BY_PHASE = {
  signal: 0.08,
  resolving: 0.08,
  system: 0.24,
  archive: 0.12,
  leaving: 0.1,
};

// Eases the scene's ambient light toward the target intensity for the
// current phase instead of snapping, so the SIGNAL -> SYSTEM wake and the
// SYSTEM -> ARCHIVE recede read as a slow reconstruction rather than a
// light switch. Skipped under reduced motion, where the target is applied
// directly.
function AmbientLight({ target, reduceMotion }) {
  const ref = useRef();

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (reduceMotion) {
      ref.current.intensity = target;
      return;
    }
    const lerpSpeed = 1 - Math.pow(0.001, delta);
    ref.current.intensity += (target - ref.current.intensity) * lerpSpeed;
  });

  return (
    <ambientLight ref={ref} intensity={target} color="#243232" />
  );
}

const CAMERA_BY_PHASE = {
  signal: [0, 1.85, 6.2],
  resolving: [0, 1.85, 6.14],
  system: [0, 1.82, 6.04],
  archive: [0.04, 1.88, 6.24],
  leaving: [0.04, 1.88, 6.28],
};

function CameraResponse({ phase, reduceMotion }) {
  const target = CAMERA_BY_PHASE[phase] ?? CAMERA_BY_PHASE.signal;

  useFrame(({ camera }, delta) => {
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    camera.position.x += (target[0] - camera.position.x) * amount;
    camera.position.y += (target[1] - camera.position.y) * amount;
    camera.position.z += (target[2] - camera.position.z) * amount;
    camera.lookAt(0, 0.78, 0);
  });

  return null;
}

export default function PreludeScene({
  reduceMotion = false,
  phase = "signal",
  terminalLines = [],
}) {
  const ambientIntensity = AMBIENT_BY_PHASE[phase] ?? AMBIENT_BY_PHASE.signal;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.85, 6.2], fov: 42 }}
      onCreated={({ camera }) => {
        // Explicit authored framing: look slightly below the monitor center
        // so the CRT sits in the lower-middle of the composition.
        camera.lookAt(0, 0.78, 0);
      }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      }}
    >
      {/* Transparent canvas lets the DOM ghost title show through empty space. */}
      <fog attach="fog" args={["#020202", 5, 14]} />
      <CameraResponse phase={phase} reduceMotion={reduceMotion} />

      {/* Enough ambient/rim light to reveal the dark casing silhouette.
          Eases toward each phase's target rather than staying fixed. */}
      <AmbientLight target={ambientIntensity} reduceMotion={reduceMotion} />

      <directionalLight
        position={[-2.5, 4, 2]}
        intensity={0.34}
        color="#465d5d"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <pointLight
        position={[0, 2.2, -1.5]}
        intensity={0.46}
        color="#284545"
        distance={8}
        decay={2}
      />

      <Ground />

      {/* Slightly lowered; scale is handled inside CRTTerminal so all of its
          geometry and attached Html text shrink together. */}
      <CRTTerminal
        position={[0, -0.08, 0]}
        phase={phase}
        terminalLines={terminalLines}
        reduceMotion={reduceMotion}
      />

      <Debris />
      <Particles reduceMotion={reduceMotion} />
    </Canvas>
  );
}
