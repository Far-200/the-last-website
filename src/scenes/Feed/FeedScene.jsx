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

import { Canvas } from "@react-three/fiber";
import FeedCamera from "./FeedCamera";
import FeedFragment from "./FeedFragment";
import FeedGhostTraces from "./FeedGhostTraces";
import FeedDebris from "./FeedDebris";
import FeedParticles from "./FeedParticles";
import FeedArchitecture, { APERTURE_Z } from "./FeedArchitecture";

// Must stay identical to `.feed-root`'s background in feed.css.
export const HAZE = "#0d1112";

export default function FeedScene({ fragments, progressRef, reduceMotion }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.75, 12], fov: 52, near: 0.1, far: 320 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      {/* far reaches past the aperture at z -186 so the end of the nave
          grades into haze instead of clipping. */}
      <fog attach="fog" args={[HAZE, 16, 170]} />

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

      {/* Key: from high behind the aperture, raking back up the nave. It
          reads on the floor and on any surface angled away from the
          camera — silhouette and rim, not flat illumination. */}
      <directionalLight
        position={[0, 26, APERTURE_Z + 10]}
        intensity={9}
        color="#8b9a92"
      />

      {/* Fill over the camera's shoulder so the near faces of the
          colonnade are charcoal rather than black. Deliberately much
          weaker than the key. */}
      <directionalLight position={[7, 14, 34]} intensity={10} color="#42565c" />

      {/* The aperture as an actual light source rather than a painted
          bright rectangle: it falls off with distance, so the far end of
          the nave is genuinely brighter than the near end and the depth
          gradient is lit rather than faked. */}
      <pointLight
        position={[0, 10, APERTURE_Z + 6]}
        intensity={1900}
        color="#8fa096"
        distance={150}
        decay={2}
      />

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
