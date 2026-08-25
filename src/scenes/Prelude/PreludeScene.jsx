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
//
// Leaving-phase camera authority
// -------------------------------
// CameraResponse and AmbientLight own position/fog/light for every phase
// except "leaving" — the moment the visitor has actually pressed
// [ ENTER ARCHIVE ], both step aside (see their own `phase === "leaving"`
// guards) and LeavingDolly takes exclusive authority over the camera
// (position, look-at, FOV), the fog, and every light in the scene, all
// driven by the single leavingProgressRef GSAP animates in Prelude.jsx.
// One ref, one reader, one writer per property at any moment — the same
// rule the project already applies to progressRef elsewhere, just with
// an explicit handoff at a phase boundary instead of a single owner for
// the scene's whole lifetime.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
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
// directly. Also steps aside once phase is "leaving" — see the header
// note on leaving-phase camera authority — so LeavingDolly is the only
// thing still writing to this ref from that point on.
function AmbientLight({ target, phase, reduceMotion, ref }) {
  useFrame((_, delta) => {
    if (!ref.current || phase === "leaving") return;
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
    // Steps aside once leaving starts — LeavingDolly takes exclusive
    // authority from here (see the header note). Without this guard both
    // would write camera.position on the same frame.
    if (phase === "leaving") return;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    camera.position.x += (target[0] - camera.position.x) * amount;
    camera.position.y += (target[1] - camera.position.y) * amount;
    camera.position.z += (target[2] - camera.position.z) * amount;
    camera.lookAt(...LOOK_AT);
  });

  return null;
}

// --- Leaving: the forward dolly into Feed --------------------------
// Position, look-at and FOV ease from the archive frame's resting pose
// toward a frame chosen to match Feed's own opening shot as closely as
// perceptual continuity requires: eye height close to Feed's EYE_HEIGHT
// (1.75), a near-level/slightly-upward gaze (Feed looks ~2 degrees up,
// see FeedCamera's LOOK_RISE), and FOV widened to Feed's own 52 so there
// is no FOV snap at the cut. World coordinates between the two scenes
// mean nothing to each other — only the eye's read of the frame does.
const LEAVING_START = { pos: [0.04, 1.88, 6.28], lookAt: [0.3, 0.72, 0], fov: 42 };
const LEAVING_END = { pos: [0, 1.7, 1.0], lookAt: [0, 1.9, -10], fov: 52 };

// Fog tightens toward the camera over the same span, so the world goes
// dark because the visitor is pushing into it, not because a value is
// fading in front of it. #020202 (see the Canvas's <fog> below) is close
// enough to true black that a fully tightened fog reads as darkness by
// itself — no separate "fade to black" step is needed on top of it.
const LEAVING_FOG_START = [5, 14];
const LEAVING_FOG_END = [0.3, 1.8];

function LeavingDolly({
  phase,
  leavingProgressRef,
  reduceMotion,
  ambientRef,
  directionalRef,
  pointRef,
  fogRef,
}) {
  useFrame(({ camera }) => {
    if (phase !== "leaving") return;

    // Reduced motion: no translation, no FOV change, no fog move — the
    // camera stays exactly where CameraResponse's own easing last left
    // it (already close to LEAVING_START, since "archive" and "leaving"
    // share nearly the same pose). Only the lights still dim, and only
    // briefly (see Prelude.jsx's shorter reduced-motion duration) — an
    // opacity-like value change carries no vestibular risk the way a
    // moving camera does.
    const t = THREE.MathUtils.clamp(leavingProgressRef.current, 0, 1);
    if (!reduceMotion) {
      camera.position.set(
        THREE.MathUtils.lerp(LEAVING_START.pos[0], LEAVING_END.pos[0], t),
        THREE.MathUtils.lerp(LEAVING_START.pos[1], LEAVING_END.pos[1], t),
        THREE.MathUtils.lerp(LEAVING_START.pos[2], LEAVING_END.pos[2], t),
      );
      camera.lookAt(
        THREE.MathUtils.lerp(LEAVING_START.lookAt[0], LEAVING_END.lookAt[0], t),
        THREE.MathUtils.lerp(LEAVING_START.lookAt[1], LEAVING_END.lookAt[1], t),
        THREE.MathUtils.lerp(LEAVING_START.lookAt[2], LEAVING_END.lookAt[2], t),
      );
      if (camera.isPerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(LEAVING_START.fov, LEAVING_END.fov, t);
        camera.updateProjectionMatrix();
      }
    }

    // Darkness is backloaded (t^2.4) rather than linear: the frame stays
    // readable through most of the push and then swallows itself in the
    // final stretch, which is what makes the occlusion read as "extremely
    // short" against a "deliberate" forward move rather than the whole
    // beat being one long fade.
    const darkT = Math.pow(t, 2.4);

    if (fogRef.current) {
      fogRef.current.near = THREE.MathUtils.lerp(LEAVING_FOG_START[0], LEAVING_FOG_END[0], darkT);
      fogRef.current.far = THREE.MathUtils.lerp(LEAVING_FOG_START[1], LEAVING_FOG_END[1], darkT);
    }
    const dim = 1 - darkT * 0.96;
    if (ambientRef.current) ambientRef.current.intensity = AMBIENT_BY_PHASE.leaving * dim;
    if (directionalRef.current) directionalRef.current.intensity = 0.5 * dim;
    if (pointRef.current) pointRef.current.intensity = 0.46 * dim;
  });

  return null;
}

export default function PreludeScene({
  reduceMotion = false,
  phase = "signal",
  leavingProgressRef,
}) {
  const ambientIntensity = AMBIENT_BY_PHASE[phase] ?? AMBIENT_BY_PHASE.signal;
  const ambientRef = useRef(null);
  const directionalRef = useRef(null);
  const pointRef = useRef(null);
  const fogRef = useRef(null);

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
      <fog ref={fogRef} attach="fog" args={["#020202", 5, 14]} />
      <CameraResponse phase={phase} reduceMotion={reduceMotion} />
      {leavingProgressRef && (
        <LeavingDolly
          phase={phase}
          leavingProgressRef={leavingProgressRef}
          reduceMotion={reduceMotion}
          ambientRef={ambientRef}
          directionalRef={directionalRef}
          pointRef={pointRef}
          fogRef={fogRef}
        />
      )}

      {/* Enough ambient/rim light to reveal the dark casing silhouette.
          Eases toward each phase's target rather than staying fixed. */}
      <AmbientLight ref={ambientRef} target={ambientIntensity} phase={phase} reduceMotion={reduceMotion} />

      <directionalLight
        ref={directionalRef}
        position={[-2.5, 4, 2]}
        intensity={0.5}
        color="#465d5d"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <pointLight
        ref={pointRef}
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
