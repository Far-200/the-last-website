// src/scenes/Prelude/PreludeScene.jsx
//
// The Three.js layer of the Prelude: fixed cinematic camera, restrained
// lighting, fog for depth, a rough ground plane, the CRT, debris, and
// ambient dust. No OrbitControls — this is an authored view.
//
// SIGNAL framing note: the CRT used to sit at the origin, facing the
// camera head-on, with the camera's look-at point landing exactly on its
// screen. That made the screen the compositional subject and turned it
// into a small, centred, cyan rectangle. It is now turned roughly 60°
// away and pushed into the right third, so the camera sees the machine
// at a grazing angle — casing and silhouette, not a presented display.
// The look-at point is empty dark space between the packet-capture text
// (left) and the machine (right), which is the correct subject for a
// depth about the signal outside the machine.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import CRTTerminal from "../../three/elements/CRTTerminal";
import Debris from "../../three/elements/Debris";
import Particles from "../../three/elements/Particles";

// Metalness dropped from 0.35 to 0.08 and the base value lifted a touch:
// a metallic floor has almost no diffuse response, so the CRT's spill
// light had nothing to pool on. This is now a rough dielectric surface
// that actually catches the screen glow.
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#0a0c0c" roughness={0.92} metalness={0.08} />
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

// Empty dark space, deliberately not the machine. Kept as one constant so
// the Canvas's initial framing and the per-frame response can never drift
// apart.
const LOOK_AT = [0.3, 0.72, 0];

function CameraResponse({ phase, reduceMotion }) {
  const target = CAMERA_BY_PHASE[phase] ?? CAMERA_BY_PHASE.signal;

  useFrame(({ camera }, delta) => {
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    camera.position.x += (target[0] - camera.position.x) * amount;
    camera.position.y += (target[1] - camera.position.y) * amount;
    camera.position.z += (target[2] - camera.position.z) * amount;
    camera.lookAt(...LOOK_AT);
  });

  return null;
}

export default function PreludeScene({ reduceMotion = false, phase = "signal" }) {
  const ambientIntensity = AMBIENT_BY_PHASE[phase] ?? AMBIENT_BY_PHASE.signal;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.85, 6.2], fov: 42 }}
      onCreated={({ camera }) => {
        camera.lookAt(...LOOK_AT);
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
        intensity={0.5}
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

      {/* Off-centre and turned ~60° away from the view axis. At this
          angle the screen plane presents as a thin sliver rather than a
          face-on rectangle, and its glow reaches the composition only as
          spill on the floor. Scale is handled inside CRTTerminal. */}
      <CRTTerminal
        position={[2.3, -0.08, -0.4]}
        rotation={[0, 1.05, 0]}
        phase={phase}
        reduceMotion={reduceMotion}
      />

      <Debris />
      <Particles reduceMotion={reduceMotion} />
    </Canvas>
  );
}
