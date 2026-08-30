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
import * as THREE from "three";
import MemoriesCamera from "./MemoriesCamera";
import MemoriesArrival from "./MemoriesArrival";
import MemoriesArchitecture from "./MemoriesArchitecture";
import MemoriesResidue from "./MemoriesResidue";
import MemoriesArchive from "./MemoriesArchive";
import MemoryFragment from "./MemoryFragment";
import MemoryFragmentVoicemail from "./MemoryFragmentVoicemail";
import MemoryFragmentPhoto from "./MemoryFragmentPhoto";
import { LAMP_POSITION, lampBreath, ARRIVAL_POSE } from "./layout";

// Matches MemoriesCamera's own start — which is now part-way down the
// stair, not the room's normal opening pose. Only seen for the frame
// before its useFrame takes over, but a mismatch reads as a jump on mount.
const START = ARRIVAL_POSE;

// Fog across arrival. The Graveyard hands over with its own fog closed to
// far = 8, because at that moment its camera is inside a concrete shaft
// with nothing further away than the back wall. Opening straight onto
// this scene's resting far = 18 would therefore show, in one frame, more
// depth than the outgoing frame had — which is exactly the kind of jump
// the handoff exists to avoid. So the far plane starts matched and eases
// out as the camera comes off the flight into the room.
//
// This is the only writer of fog in Memories; nothing else touches it.
const ARRIVAL_FOG = [0.5, 9];
const RESTING_FOG = [2.5, 18];

function ArrivalFog({ arrival, arrivalProgressRef }) {
  const fogRef = useRef(null);

  useFrame(() => {
    const fog = fogRef.current;
    if (!fog) return;
    const raw = arrival ? THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1) : 1;
    const t = arrival ? raw * raw * (3 - 2 * raw) : 1;
    fog.near = THREE.MathUtils.lerp(ARRIVAL_FOG[0], RESTING_FOG[0], t);
    fog.far = THREE.MathUtils.lerp(ARRIVAL_FOG[1], RESTING_FOG[1], t);
  });

  return (
    <fog
      ref={fogRef}
      attach="fog"
      args={[WARM_DARK, ...(arrival ? ARRIVAL_FOG : RESTING_FOG)]}
    />
  );
}

// Fires on the Canvas's first actual rendered frame, exactly as Feed and
// the Graveyard already do. Memories.jsx uses it to start the arrival
// clock: this scene builds a room, three fragments, an archive layer and a
// shadow-casting lamp on mount, and measuring a two-and-a-half-second
// entrance against wall-clock time while that is still being uploaded to
// the GPU would leave the entrance visibly part-finished on the first
// frame the visitor actually sees.
//
// Unlike the Graveyard's, this one has no asset to wait on. Every texture
// in Memories is drawn to a canvas synchronously and there is no glTF, so
// first-frame readiness is genuinely the whole condition here — see
// GraveyardScene's AssetGate for the case where it is not.
function ReadySignal({ onReady }) {
  const firedRef = useRef(false);
  useFrame(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReady?.();
  });
  return null;
}

// Must stay identical to `.memories-root`'s background in memories.css
// and to `.graveyard-leave-overlay`'s colour — the Graveyard fades to
// this exact value before handing over, so the swap has no seam.
export const WARM_DARK = "#0b0806";

const LAMP_INTENSITY_BASE = 10.5;
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
  const clock = useRef(0);

  useFrame((_, delta) => {
    const light = lightRef.current;
    if (!light) return;
    const target = LAMP_INTENSITY_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.05, delta);
    smoothed.current += (target - smoothed.current) * amount;
    // Shares the bulb mesh's own breath curve (layout.js) rather than
    // running a second one, so the visible element and the light it casts
    // can never drift apart.
    clock.current += delta;
    const breath = reduceMotion ? 1 : lampBreath(clock.current);
    light.intensity = LAMP_INTENSITY_BASE * smoothed.current * breath;
  });

  return (
    <pointLight
      ref={lightRef}
      position={LAMP_POSITION}
      intensity={LAMP_INTENSITY_BASE}
      distance={9}
      decay={2}
      color="#cfb08d"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0015}
    />
  );
}

const BOUNCE_INTENSITY = 2.2;

function BounceLight({ phase, reduceMotion }) {
  const lightRef = useRef(null);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const light = lightRef.current;
    if (!light) return;
    const target = LAMP_INTENSITY_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.05, delta);
    smoothed.current += (target - smoothed.current) * amount;
    light.intensity = BOUNCE_INTENSITY * smoothed.current;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[-1.62, 1.6, 2.45]}
      intensity={BOUNCE_INTENSITY}
      distance={3.0}
      decay={2}
      color="#b9a289"
    />
  );
}

// --- What is left when the waiting stops ---------------------------------
// Extinction used to end on pure black, which is not the same thing as
// absence: with every warm source ramped to zero and the cold fill at 0.5
// there was nothing left in frame to be absent FROM, and the last beat of
// the whole experience read as the renderer switching off.
//
// This is the inverse of every other ramp in the scene. It is zero for
// the entire visit and rises only at "dark" and "leaving" — the two
// phases in which the lamp, the photograph and the dust are going out —
// so as the warmth drains, a thin cold light comes up behind it and the
// room is still THERE: the chair, the desk, the open box, the print. The
// place has not been deleted. It has stopped being held open for
// somebody, which is a different and worse thing, and it is the sentence
// the last frame has to say.
//
// It changes no timing and no state: it reads the same phase prop as
// everything else and uses the same lerp, only with the target inverted.
const COLD_BY_PHASE = { dark: 1, leaving: 1 };
const COLD_INTENSITY = 1.9;
const COLD_FILL_INTENSITY = 0.62;

function ColdResidual({ reduceMotion, phase }) {
  const keyRef = useRef(null);
  const fillRef = useRef(null);
  const level = useRef(0);

  useFrame((_, delta) => {
    const target = COLD_BY_PHASE[phase] ?? 0;
    // Slower than the warm ramps it replaces, so the cold arrives after
    // the warmth has gone rather than crossfading with it.
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.16, delta);
    level.current += (target - level.current) * amount;
    if (keyRef.current) keyRef.current.intensity = COLD_INTENSITY * level.current;
    if (fillRef.current) fillRef.current.intensity = COLD_FILL_INTENSITY * level.current;
  });

  return (
    <>
      {/* Directional, not ambient: the room has to be MODELLED at the end
          — a chair with a coat still on it, a desk, a box left open — and
          a directionless fill would return the same flat grey soup the
          entry frame had to be rescued from. */}
      <directionalLight
        ref={keyRef}
        position={[-3.5, 4.2, 2.6]}
        intensity={0}
        color="#8fa6b8"
      />
      <hemisphereLight ref={fillRef} args={["#28323c", "#080a0c", 0]} />
    </>
  );
}

export default function MemoriesScene({
  progressRef,
  reduceMotion,
  phase,
  arrival = false,
  arrivalProgressRef,
  onReady,
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      // Mounts at the Graveyard's 50, not at this scene's resting 42.
      // MemoriesCamera's arrival branch spends the difference across the
      // descent and lands on exactly 42, so the first painted frame here
      // is the same lens as the last painted frame there. See its note.
      camera={{ position: START, fov: 50, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      {onReady && <ReadySignal onReady={onReady} />}

      {/* Tight and close. This is what builds the room: past ~18 units
          everything is gone, so the corner reads as enclosed without a
          ceiling, a fourth wall, or any geometry beyond the fragments.
          During arrival it starts tighter still — see ArrivalFog. */}
      <ArrivalFog arrival={arrival} arrivalProgressRef={arrivalProgressRef} />

      {/* The cold remainder of the Graveyard's world - and it has to stay
          SMALL. At 1.15 this term was lifting the two broken walls into
          mid-grey planes that filled half the entry frame, brighter than
          anything standing in front of them, so the empty chair had
          nothing to separate against and the warm desk had nothing to be
          an island in. A hemisphere light is directionless: every extra
          unit of it goes to the largest surfaces in the room, which are
          exactly the surfaces that should be dark. Pulled to 0.5, the
          walls fall away, the lamp's pool becomes the only lit thing, and
          cold survives where it belongs - in the corners, not on them. */}
      <hemisphereLight args={["#1e2831", "#06080a", 0.5]} />

      {/* The lamp's practical light. Measured off the first render, this
          was much too strong: at intensity 17 over a 13-unit radius it
          washed the whole floor and table and produced exactly the
          "sunset preset" the brief rules out. Pulled to 8 over 7 units,
          the pool is small enough that its edge falls inside the frame,
          which is the difference between a lit room and one lit object.
          The colour is also dirtier — #e0a259 was a clean saturated
          orange; this is closer to an old tungsten bulb behind a dusty
          shade. Desaturated one more step in the cinematic pass, from
          #c9a173 to #cfb08d: the brief for this scene is warm IVORY, and
          with the environment albedos now cold (see
          MemoriesArchitecture's palette note) the light no longer has to
          carry the warmth on its own. */}
      <LampLight phase={phase} reduceMotion={reduceMotion} />

      {/* BOUNCE. The lamp shade is open at the top and sits half a metre
          from a pale broken wall, so light leaving it upward and sideways
          returns off that wall into the room - and this is that return,
          not a new source.
          It exists because of a specific, repeated failure in the entry
          shot: the lamp sits DEEPER in the room than the chair, so from
          the entry camera every object between the visitor and the lamp
          is backlit, and the empty chair - the one thing that shot has to
          say - rendered as a black mass with an invisible coat on it at
          three different positions and two different sizes. No amount of
          moving it fixes a light that is behind it.
          It has to sit on the VISITOR'S side of the chair to do anything
          at all - a first attempt put it back by the wall and it lit the
          wall, which was the original problem with extra steps. From up
          and slightly in front, the way a ceiling bounce actually
          arrives, it models the chair's near face and the coat hanging on
          it. Deliberately weak and short-range: 2.2 over 3.0 units, which
          has fallen to almost nothing by the time it reaches the desk, so
          the lamp keeps ownership of the island and the warm/cold split
          survives.
          It ramps on the same phase table as the lamp, so the room still
          goes dark in one piece. */}
      <BounceLight phase={phase} reduceMotion={reduceMotion} />

      {/* See ColdResidual: the light that comes up as the warm light goes
          out, so the last frame is a room that stopped waiting rather
          than a black screen. */}
      <ColdResidual phase={phase} reduceMotion={reduceMotion} />

      <MemoriesCamera
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
      />

      {/* The bottom of the stair from the Graveyard. Sits entirely behind
          the scene's normal opening pose and contributes nothing to the
          settled room — its two spill lights ramp to zero before arrival
          completes. See MemoriesArrival.jsx. */}
      <MemoriesArrival arrival={arrival} arrivalProgressRef={arrivalProgressRef} />

      <MemoriesArchitecture phase={phase} reduceMotion={reduceMotion} />
      <MemoriesResidue />
      {/* Depth, foreground and atmosphere — the layer that stops each
          stop being "one lit object, then dark". See MemoriesArchive.jsx;
          it owns nothing the fragments own and its emissive panels sit at
          a fortieth of a memory's, so it can never lead a frame. */}
      <MemoriesArchive phase={phase} reduceMotion={reduceMotion} />
      <MemoryFragment phase={phase} reduceMotion={reduceMotion} />
      <MemoryFragmentVoicemail phase={phase} reduceMotion={reduceMotion} />
      <MemoryFragmentPhoto phase={phase} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
