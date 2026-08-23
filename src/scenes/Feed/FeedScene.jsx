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
import FeedCamera from "./FeedCamera";
import FeedFragment from "./FeedFragment";
import FeedGhostTraces from "./FeedGhostTraces";
import FeedDebris from "./FeedDebris";
import FeedParticles from "./FeedParticles";
import FeedArchitecture, { APERTURE_Z } from "./FeedArchitecture";

// Must stay identical to `.feed-root`'s background in feed.css.
export const HAZE = "#0d1112";

// Where the "instead of being rewarded with brightness, the light
// weakens" response starts, as a fraction of the route's own progress
// (not raw distance) — the last stretch before Feed.jsx's own
// progress===1 threshold fires the fade-to-black handoff.
const THRESHOLD_START = 0.88;

// Owns the three lights that make the aperture read as a destination
// (key, fill, aperture glow) plus the fog, and eases all four toward a
// dimmer, more compressed state as progress closes in on the route's
// end. Kept as one component so the "light weakens" response and the
// "compression" of the haze move together on the same eased value.
function ThresholdAtmosphere({ progressRef, reduceMotion }) {
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
    const t = smoothed.current;

    if (keyRef.current) keyRef.current.intensity = 9 * (1 - t * 0.85);
    if (fillRef.current) fillRef.current.intensity = 10 * (1 - t * 0.5);
    if (apertureRef.current) apertureRef.current.intensity = 1900 * (1 - t * 0.92);
    if (fogRef.current) {
      fogRef.current.near = 16 - t * 10;
      fogRef.current.far = 170 - t * 100;
    }
  });

  return (
    <>
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

export default function FeedScene({ fragments, progressRef, reduceMotion }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.75, 12], fov: 52, near: 0.1, far: 320 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
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

      {/* Indirect, sourceless base. The sky term is what lifts the floor
          plane into visibility; the ground term keeps the vault undersides
          dark without crushing them to black. */}
      <hemisphereLight args={["#36474b", "#1a2120", 12]} />

      {/* Key (raking back up the nave from behind the aperture), fill
          (over the camera's shoulder) and the aperture's own point light,
          plus the fog they sit inside — all four eased toward a dimmer,
          more compressed state as progress nears the route's end. See
          ThresholdAtmosphere above. */}
      <ThresholdAtmosphere progressRef={progressRef} reduceMotion={reduceMotion} />

      <FeedCamera progressRef={progressRef} reduceMotion={reduceMotion} />

      <FeedArchitecture />
      <FeedDebris />

      {fragments.map((fragment) => (
        <FeedFragment key={fragment.id} fragment={fragment} reduceMotion={reduceMotion} />
      ))}

      <FeedGhostTraces reduceMotion={reduceMotion} />

      <FeedParticles reduceMotion={reduceMotion} />
    </Canvas>
  );
}
