// src/scenes/Feed/FeedScene.jsx
//
// The Three.js layer of the Feed. No OrbitControls, no free look —
// FeedCamera is the only camera authority, driven by the progress ref
// owned by Feed.jsx. Owns its own Canvas while Feed is mounted, matching
// PreludeScene's per-scene ownership (Prelude and Feed never mount
// simultaneously, so this isn't a duplicate live context).
//
// Atmosphere
// ----------
// The previous pass fogged to #020202 — near-black haze behind near-black
// geometry, which carries no depth information at all: an object 10 units
// away and one 28 units away resolved to the same value. Atmospheric
// perspective needs the haze to be *lighter* than the silhouettes in
// front of it, so distance reads as progressive paling.
//
// So: the haze is a cold, low grey-green, and it is the same value as the
// page background behind the transparent canvas. That match matters for
// more than tidiness — FeedFragment fades its DOM cards toward
// transparency with distance, and the surface they blend into is that
// page background. Fog colour, canvas clear and `.feed-root` background
// must stay the same value or fragments will fade toward a different
// colour than the geometry around them.
//
// Lighting is a back-light, not a fill: the key comes from behind the
// aperture at the far end and travels toward the camera, so the
// colonnade and the vaults present as silhouettes against the haze. One
// weak fill from over the camera's shoulder keeps the near faces from
// going fully black. Nothing here is a visible lamp.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import FeedCamera, { ARRIVAL_DISTANCE } from "./FeedCamera";
import FeedFragment from "./FeedFragment";
import FeedGhostTraces from "./FeedGhostTraces";
import FeedDebris from "./FeedDebris";
import FeedParticles from "./FeedParticles";
import FeedSecondaryFragments from "./FeedSecondaryFragments";
import FeedArchiveField from "./FeedArchiveField";
import FeedInfrastructure from "./FeedInfrastructure";
import FeedArchitecture, { APERTURE_Z, ROUTE_START_Z } from "./FeedArchitecture";

// Must stay identical to `.feed-root`'s background in feed.css.
export const HAZE = "#0d1112";

// Where the "instead of being rewarded with brightness, the light
// weakens" response starts, as a fraction of the route's own progress
// (not raw distance) — the last stretch before Feed.jsx's own
// progress===1 handoff. Its leaving phase layers onto this response so
// Feed's own haze, rather than a DOM overlay, hides the exclusive swap.
const THRESHOLD_START = 0.88;

// Arrival-side counterpart to THRESHOLD_START's exit dimming: the fog
// starts pulled in tight to the camera and every light starts a shade
// above zero (not literally zero — a hard-zero first frame reads as a
// missing light, not as atmosphere) so the frame is heavily occluded on
// mount, matching the darkness LeavingDolly leaves the Prelude side on.
// Both ease back to the scene's normal baseline (which is exactly what
// this component already computes at progress=0/threshold-t=0) as
// arrivalProgressRef advances from Feed.jsx's own GSAP tween.
const ARRIVAL_FOG = [1, 5];
const ARRIVAL_DIM_FLOOR = 0.06;

// Owns every light in the scene (hemisphere, key, fill, aperture glow)
// plus the fog, so the two ends of Feed's atmosphere — arriving into it
// and approaching the threshold out the far end — share one place that
// writes these values instead of two systems that could disagree about
// what "normal" looks like in between. Arrival and the threshold-exit
// response never overlap in time (progress is held at 0 throughout
// arrival), so there is never a conflict about which one is "in charge"
// on a given frame — the two blends simply multiply together, and
// whichever one is inactive contributes exactly 1.
function Atmosphere({
  progressRef,
  reduceMotion,
  arrival,
  arrivalProgressRef,
  leaving,
  leavingProgressRef,
}) {
  const hemiRef = useRef(null);
  const keyRef = useRef(null);
  const fillRef = useRef(null);
  const apertureRef = useRef(null);
  const fogRef = useRef(null);
  const smoothed = useRef(0);

  useFrame((_, delta) => {
    const raw = Math.min(
      1,
      Math.max(0, (progressRef.current - THRESHOLD_START) / (1 - THRESHOLD_START)),
    );
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.001, delta);
    smoothed.current += (raw - smoothed.current) * amount;
    const exitT = smoothed.current;

    const baseNear = 16 - exitT * 10;
    const baseFar = 170 - exitT * 100;
    const exitDim = { key: 1 - exitT * 0.85, fill: 1 - exitT * 0.5, aperture: 1 - exitT * 0.92 };

    const at = arrival ? THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1) : 1;
    // Steeply backloaded relative to the camera's own (already-eased)
    // arrival curve. This has to be much more aggressive than it looks:
    // fog/light aren't lerping toward small numbers, they're lerping
    // toward this scene's genuinely huge resting values (fog far=170,
    // the aperture's point light at 1900 intensity) — through ACES tone
    // mapping, even 25% of that reveal was enough to read as fully lit,
    // because the far end of a linear intensity ramp compresses hard
    // under tone mapping while the near end (where this needs to spend
    // most of its time) doesn't. An exponent of 1.6 left the scene
    // visually resolved by ~35% of the way through arrival; at 3.2, ~80%
    // of the visible clearing happens in the last fifth of the duration,
    // camera settling largely already done. Camera position uses `at`
    // directly — see FeedCamera — so it keeps its own gentler
    // deceleration independent of this.
    const revealT = arrival ? Math.pow(at, 5) : 1;
    const arrivalDim = arrival ? ARRIVAL_DIM_FLOOR + (1 - ARRIVAL_DIM_FLOOR) * revealT : 1;
    // Keep the forward move readable until late, then collapse the
    // already-dim threshold atmosphere around the camera.
    const leaveRaw = leaving ? THREE.MathUtils.clamp(leavingProgressRef?.current ?? 1, 0, 1) : 0;
    const swallowT = Math.pow(leaveRaw, 3);
    const leavingDim = 1 - swallowT * 0.96;

    if (hemiRef.current) hemiRef.current.intensity = 12 * arrivalDim * leavingDim;
    if (keyRef.current) keyRef.current.intensity = 9 * exitDim.key * arrivalDim * leavingDim;
    if (fillRef.current) fillRef.current.intensity = 10 * exitDim.fill * arrivalDim * leavingDim;
    if (apertureRef.current) {
      apertureRef.current.intensity = 1900 * exitDim.aperture * arrivalDim * leavingDim;
    }
    if (fogRef.current) {
      const near = arrival ? THREE.MathUtils.lerp(ARRIVAL_FOG[0], baseNear, revealT) : baseNear;
      const far = arrival ? THREE.MathUtils.lerp(ARRIVAL_FOG[1], baseFar, revealT) : baseFar;
      fogRef.current.near = THREE.MathUtils.lerp(near, 0.8, swallowT);
      fogRef.current.far = THREE.MathUtils.lerp(far, 6.5, swallowT);
    }
  });

  return (
    <>
      {/* Indirect, sourceless base. The sky term is what lifts the floor
          plane into visibility; the ground term keeps the vault
          undersides dark without crushing them to black. */}
      <hemisphereLight ref={hemiRef} args={["#36474b", "#1a2120", 12]} />

      <fog ref={fogRef} attach="fog" args={[HAZE, 16, 170]} />

      <directionalLight
        ref={keyRef}
        position={[0, 26, APERTURE_Z + 10]}
        intensity={9}
        color="#8b9a92"
      />

      <directionalLight ref={fillRef} position={[7, 14, 34]} intensity={10} color="#42565c" />

      <pointLight
        ref={apertureRef}
        position={[0, 10, APERTURE_Z + 6]}
        intensity={1900}
        color="#8fa096"
        distance={150}
        decay={2}
      />
    </>
  );
}

// Fires once, on the Canvas's first actual rendered frame — not on mount
// (before the WebGL context and this scene's geometry/materials exist)
// and not on Canvas's `onCreated` (which fires once the renderer exists
// but before anything has necessarily been drawn). Feed.jsx uses this to
// delay starting the arrival clock until there is something on screen to
// animate: starting it at mount time measured real elapsed time against
// wall-clock duration while Feed's initial scene graph — columns, vaults,
// the instanced archive field, eight fragment cards — was still being
// constructed and uploaded to the GPU, which on a busy frame can itself
// take a few hundred milliseconds. That's real time GSAP doesn't get
// back, and against an arrival only ~1.1s long it was consuming enough
// of the budget that the reveal read as already mostly finished by the
// time the first frame actually painted.
function ReadySignal({ onReady }) {
  const firedRef = useRef(false);
  useFrame(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReady?.();
  });
  return null;
}

export default function FeedScene({
  fragments,
  progressRef,
  reduceMotion,
  arrival = false,
  arrivalProgressRef,
  leaving = false,
  leavingProgressRef,
  onReady,
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{
        position: [0, 1.75, arrival ? ROUTE_START_Z + ARRIVAL_DISTANCE : ROUTE_START_Z],
        fov: 52,
        near: 0.1,
        far: 320,
      }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      {onReady && <ReadySignal onReady={onReady} />}
      {/* These intensities look large next to the Prelude's, and they are
          not comparable. A surface here resolves to roughly
          `irradiance * albedo / PI`, then ACES tone mapping, then the sRGB
          transfer — three successive reductions. With the values this
          scene needs (dark stone, deep shadow) the first pass landed the
          near piers at RGB (0,1,1) with 99% of the frame inside the
          bottom eighth of the range: the architecture was lit, just not
          by enough to survive that chain. Measured, not guessed — the
          near stone now lands around RGB 32-40, which is dark but
          legible. */}
      <Atmosphere
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
        leaving={leaving}
        leavingProgressRef={leavingProgressRef}
      />

      <FeedCamera
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
        leaving={leaving}
        leavingProgressRef={leavingProgressRef}
      />

      <FeedArchitecture />
      <FeedDebris />

      {/* The ruined information layer built into the nave — rack towers,
          feed pylons, overhead ducts, cable, conduit, chunky debris and
          distant tower silhouettes. Static authored geometry only; it
          composes the depth bands around FeedCamera's route without
          touching the camera, fog or lights. See FeedInfrastructure. */}
      <FeedInfrastructure />

      {/* Physical archive population, kept separate from both authored
          primary fragments and text-only ghost traces. The secondary layer
          carries a few recognizable content types; the instanced field
          implies the much larger volume behind them. */}
      <FeedArchiveField />
      <FeedSecondaryFragments />

      {fragments.map((fragment) => (
        <FeedFragment key={fragment.id} fragment={fragment} reduceMotion={reduceMotion} />
      ))}

      <FeedGhostTraces reduceMotion={reduceMotion} />

      <FeedParticles reduceMotion={reduceMotion} />
    </Canvas>
  );
}
