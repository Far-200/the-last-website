// src/scenes/Memories/MemoriesScene.jsx
//
// The Three.js layer of Memories. Same per-scene Canvas ownership as
// Prelude, Feed and the Graveyard — mounted only while Memories is the
// active scene, never simultaneously with another.
//
// Lighting is two sources, and only one of them really exists: the lamp
// (see MemoriesArchitecture) plus a very weak cold fill. That ratio is
// the scene's whole colour argument. Warmth here means a human trace,
// not safety, so it has to stay small and local — a pool the visitor is
// drawn toward, with cold dark all around it. A general warm ambient
// would light the whole space evenly and turn "somebody's corner" into
// "an orange room", which is exactly the failure the brief names.
//
// The cold fill is kept deliberately: the Graveyard's palette does not
// simply stop at the scene boundary, and a little of its grey surviving
// in the shadows is what makes the amber read as an intrusion into that
// world rather than as a new one.
//
// There is no gradient backdrop sphere here, unlike the Graveyard. That
// existed to hide a horizon seam across a 1400-unit plane; this scene
// has no horizon. Fog is tight and warm, the canvas clears to the same
// value, and the page background matches — so everything past a few
// metres dissolves into one continuous dark and the enclosure costs no
// geometry at all.
//
// Extinction: `phase` (owned by Memories.jsx) drives the lamp and all
// three fragments toward darkness as the scene ends — see the
// LAMP_EMISSIVE_BY_PHASE / EMISSIVE_BY_PHASE tables in
// MemoriesArchitecture.jsx and the three fragment files. This component
// just forwards the phase down; it owns none of the fade logic itself.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import MemoriesCamera from "./MemoriesCamera";
import MemoriesArchitecture from "./MemoriesArchitecture";
import MemoryFragment from "./MemoryFragment";
import MemoryFragmentVoicemail from "./MemoryFragmentVoicemail";
import MemoryFragmentPhoto from "./MemoryFragmentPhoto";
import { LAMP_POSITION } from "./layout";

// Matches MemoriesCamera's own start. Only seen for the frame before its
// useFrame takes over, but a mismatch reads as a jump on mount.
const START = [0.9, 1.62, 5.1];

// Must stay identical to `.memories-root`'s background in memories.css
// and to `.graveyard-leave-overlay`'s colour — the Graveyard fades to
// this exact value before handing over, so the swap has no seam.
export const WARM_DARK = "#0b0806";

const LAMP_INTENSITY_BASE = 8;
const LAMP_INTENSITY_BY_PHASE = { dark: 0, leaving: 0 };

// Owns the actual practical light's intensity ramp — kept separate from
// MemoriesArchitecture's own bulb-mesh ramp because they are two
// different Three.js objects (a light and a material) that happen to
// need the same curve; each ramps its own ref independently rather than
// one driving the other, matching the pattern GraveyardCaptcha already
// established for its uplight.
function LampLight({ phase, reduceMotion }) {
  const lightRef = useRef(null);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const light = lightRef.current;
    if (!light) return;
    const target = LAMP_INTENSITY_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.05, delta);
    smoothed.current += (target - smoothed.current) * amount;
    light.intensity = LAMP_INTENSITY_BASE * smoothed.current;
  });

  return (
    <pointLight
      ref={lightRef}
      position={LAMP_POSITION}
      intensity={LAMP_INTENSITY_BASE}
      distance={7}
      decay={2}
      color="#c9a173"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0015}
    />
  );
}

export default function MemoriesScene({ progressRef, reduceMotion, phase }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: START, fov: 42, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      {/* Tight and close. This is what builds the room: past ~18 units
          everything is gone, so the corner reads as enclosed without a
          ceiling, a fourth wall, or any geometry beyond the fragments. */}
      <fog attach="fog" args={[WARM_DARK, 2.5, 18]} />

      {/* The cold remainder of the Graveyard's world. Raised in the
          correction pass: with too little of it the scene had no
          un-warmed values left at all and read as a single orange
          wash. This is what keeps cold in the corners so the amber can
          be a local intrusion rather than the colour of the room. */}
      <hemisphereLight args={["#1e272d", "#060505", 0.85]} />

      {/* The lamp's practical light. Measured off the first render, this
          was much too strong: at intensity 17 over a 13-unit radius it
          washed the whole floor and table and produced exactly the
          "sunset preset" the brief rules out. Pulled to 8 over 7 units,
          the pool is small enough that its edge falls inside the frame,
          which is the difference between a lit room and one lit object.
          The colour is also dirtier — #e0a259 was a clean saturated
          orange; this is closer to an old tungsten bulb behind a dusty
          shade. */}
      <LampLight phase={phase} reduceMotion={reduceMotion} />

      <MemoriesCamera progressRef={progressRef} reduceMotion={reduceMotion} />

      <MemoriesArchitecture phase={phase} reduceMotion={reduceMotion} />
      <MemoryFragment phase={phase} reduceMotion={reduceMotion} />
      <MemoryFragmentVoicemail phase={phase} reduceMotion={reduceMotion} />
      <MemoryFragmentPhoto phase={phase} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
