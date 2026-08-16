// src/scenes/Prelude/PreludeScene.jsx
//
// The Three.js layer of the Prelude: fixed cinematic camera, restrained
// lighting, fog for depth, a rough ground plane, the CRT, debris, and
// ambient dust. No OrbitControls — this is an authored view.

import { Canvas } from "@react-three/fiber";
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

export default function PreludeScene({
  reduceMotion = false,
  terminalLines = [],
}) {
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

      {/* Enough ambient/rim light to reveal the dark casing silhouette. */}
      <ambientLight intensity={0.2} color="#243232" />

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
        terminalLines={terminalLines}
      />

      <Debris />
      <Particles reduceMotion={reduceMotion} />
    </Canvas>
  );
}
