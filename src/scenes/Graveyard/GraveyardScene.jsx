// src/scenes/Graveyard/GraveyardScene.jsx
//
// The Three.js layer of the Graveyard. Same per-scene Canvas ownership
// as Prelude and Feed — mounted only while Graveyard is the active
// scene, never simultaneously with either. GraveyardCamera is the sole
// continuous camera authority; there is no OrbitControls, no free look.
//
// Lighting is deliberately three sources for the whole scene, and only
// one of them is general:
//
//   * A hemisphere term low enough that it never resolves the space —
//     it exists so unlit faces are charcoal instead of pure black.
//   * A grazing key raking up the route from behind the monument, at
//     about 9 degrees of elevation. Low enough that it describes the
//     ground's shallow relief (see groundHeight.js) rather than
//     flattening it — crests pick up a little light, troughs stay dark —
//     but not so low that it lands on nothing. A first attempt put it at
//     ~2 degrees, where N·L is 0.03 and the ground measured black
//     whatever else was tuned; 9 degrees is the balance between
//     revealing relief and actually delivering light to it.
//   * The monument's own two lights, which belong to it and travel with
//     it (see GraveyardCaptcha).
//
// Intensities are low and the ground's albedo carries the darkness
// instead — see GROUND_STONE in GraveyardArchitecture for why that
// division matters.
//
// Fog does the rest, and its colour is not free: it must stay exactly
// GraveyardArchitecture's HORIZON, because that is the value the
// backdrop gradient already is at eye level. Matching them is what makes
// distant ground dissolve into the sky instead of meeting it at a seam.
// The resting far plane is 380: dense enough that the monument emerges
// over the approach rather than reading as an opening objective, while
// still clear enough for its closing frame.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import GraveyardCamera from "./GraveyardCamera";
import GraveyardArchitecture, { EYE_HEIGHT, HORIZON } from "./GraveyardArchitecture";
import GraveyardRelics from "./GraveyardRelics";
import GraveyardMemorials from "./GraveyardMemorials";
import GraveMarkerField from "./GraveMarkerField";
import GraveyardCaptcha from "./GraveyardCaptcha";
import { groundHeightAt } from "./groundHeight";

// The first warmth in the entire experience, and the bridge to Memories.
//
// It appears only after the machine has failed to verify anybody, which
// is the whole argument of the scene: the system could not prove a human
// was here, and something human is out there regardless. It is
// deliberately off to one side and well beyond the monument rather than
// on the route ahead — at the closing camera position it sits about 35
// degrees to the left and low in frame, so it is caught peripherally
// rather than presented as the next objective. Nothing explains it.
//
// Amber, per the project's fixed colour roles, and small: one warm point
// light close to the ground plus a low emissive slab as its visible
// source, so the ground picks up a single warm pool in an otherwise cold
// scene. Never cyan, never a beacon, never animated.
// Moved inboard from (-40, -360) after the first render put it hard
// against the left edge of frame, half cut off — which reads as an
// accident rather than as something glimpsed. At (-16, -332) it sits
// about 28 degrees left of the closing aim: clear of the monument's own
// left edge by a comfortable margin, still well outside the centre of
// attention, and fully in frame.
const WARM_X = -16;
const WARM_Z = -332;
const WARM_BY_PHASE = { warming: 1, leaving: 1.35 };
const TRANSITION_DARK = "#0d1112";

function ReadySignal({ onReady }) {
  const firedRef = useRef(false);
  useFrame(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReady?.();
  });
  return null;
}

// Owns the scene fog and its two general lights for both arrival and
// ordinary progression. Monument-local lights remain owned by the
// monument. The same backloaded reveal is passed to Backdrop so its
// fog-exempt sky cannot resolve before fogged geometry does.
function Atmosphere({ arrival, arrivalProgressRef }) {
  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const keyRef = useRef(null);
  const transitionColor = useRef(new THREE.Color(TRANSITION_DARK));
  const horizonColor = useRef(new THREE.Color(HORIZON));
  const fogColor = useRef(new THREE.Color());

  useFrame(() => {
    const raw = arrival ? THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1) : 1;
    const reveal = arrival ? Math.pow(raw, 3.2) : 1;
    fogColor.current.lerpColors(transitionColor.current, horizonColor.current, reveal);

    if (fogRef.current) {
      fogRef.current.color.copy(fogColor.current);
      fogRef.current.near = THREE.MathUtils.lerp(0.8, 40, reveal);
      fogRef.current.far = THREE.MathUtils.lerp(6.5, 380, reveal);
    }
    if (hemiRef.current) hemiRef.current.intensity = 1.5 * (0.05 + 0.95 * reveal);
    if (keyRef.current) keyRef.current.intensity = 2.4 * (0.05 + 0.95 * reveal);
  });

  return (
    <>
      <fog ref={fogRef} attach="fog" args={[TRANSITION_DARK, 0.8, 6.5]} />
      <hemisphereLight ref={hemiRef} args={["#1a2023", "#040506", 0.075]} />
      <directionalLight
        ref={keyRef}
        position={[-120, 62, -400]}
        intensity={0.12}
        color="#88959a"
      />
    </>
  );
}

function WarmCue({ phase, reduceMotion }) {
  const lightRef = useRef(null);
  const slabRef = useRef(null);
  const level = useRef(0);

  useFrame((_, delta) => {
    const target = WARM_BY_PHASE[phase] ?? 0;
    // Slow even by this scene's standards: the warmth should seep in,
    // not switch on.
    level.current = reduceMotion
      ? target
      : level.current + (target - level.current) * (1 - Math.pow(0.28, delta));
    if (lightRef.current) lightRef.current.intensity = 2600 * level.current;
    if (slabRef.current) slabRef.current.material.emissiveIntensity = 0.9 * level.current;
  });

  const y = groundHeightAt(WARM_X, WARM_Z);

  return (
    <group position={[WARM_X, y, WARM_Z]}>
      <pointLight
        ref={lightRef}
        position={[0, 2.4, 0]}
        intensity={0}
        distance={64}
        decay={2}
        color="#c98a4b"
      />
      <mesh ref={slabRef} position={[0, 0.7, 0]} rotation={[0, 0.4, 0.06]}>
        <boxGeometry args={[3.4, 1.4, 2.2]} />
        <meshStandardMaterial
          color="#171310"
          emissive="#c98a4b"
          emissiveIntensity={0}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

// Matches GraveyardCamera's first waypoint. Only ever seen for the frame
// before the camera's own useFrame takes over, but a mismatch here shows
// as a visible jump on mount.
const START = [-28, EYE_HEIGHT, 10];

export default function GraveyardScene({
  progressRef,
  reduceMotion,
  captchaPhase,
  onCaptchaActivate,
  arrival = false,
  arrivalProgressRef,
  onReady,
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: START, fov: 50, near: 0.4, far: 900 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      {onReady && <ReadySignal onReady={onReady} />}
      <Atmosphere arrival={arrival} arrivalProgressRef={arrivalProgressRef} />

      <GraveyardCamera
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
      />

      <GraveyardArchitecture arrival={arrival} arrivalProgressRef={arrivalProgressRef} />
      <GraveyardRelics />
      <GraveyardMemorials />
      {/* Authored Blender kit — visual test population in one stretch of
          the route (see GraveMarkerField.jsx). Static like the towers and
          relics: it takes no arrival prop and reveals with the scene's
          own fog/light ramp. */}
      <GraveMarkerField />
      <GraveyardCaptcha
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        phase={captchaPhase}
        onActivate={onCaptchaActivate}
      />
      <WarmCue phase={captchaPhase} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
