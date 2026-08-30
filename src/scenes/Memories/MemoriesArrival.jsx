// src/scenes/Memories/MemoriesArrival.jsx
//
// The bottom of the stair the visitor came down.
//
// This is the only new geometry in Memories, it sits entirely BEHIND the
// scene's normal start pose, and it exists for one reason: so the descent
// that began in the Graveyard does not stop at a React mount boundary.
// The room itself, its lamp, its three fragments and its extinction are
// all untouched.
//
// It is not a reconstruction of the Graveyard's shaft. It is the last
// flight of the same stair, and only the parts of it the camera can
// actually see on the way in: seven treads it walks down, two walls two
// units either side, a soffit overhead, and a threshold it passes under.
// Everything above the ninth tread is out of frame for the entire arrival
// (the camera looks 22 degrees down the whole way) and is not built.
//
// Dimensions are shared with the Graveyard's exit on purpose — same 4.0
// interior, same 0.5/0.76 flight, same 2.9 soffit clearance — see
// layout.js for the full comparison and why those five numbers are the
// ones that matter.
//
// Light
// -----
// The stair is lit from BELOW, by the room. That is the correct direction
// and it is also the emotional one: what is drawing the visitor down is
// the only warm thing left. Two small amber point lights stand in for
// that spill — one at the foot of the flight, one mid-way — and both ramp
// to zero across the last part of the arrival, by which time the camera
// has passed the threshold and they are behind it. At the moment arrival
// completes the room's lighting is EXACTLY what it has always been: the
// lamp, the bounce, the cold fill, and nothing else. This component adds
// nothing to the settled scene.
//
// The amber is the Graveyard's exit amber, not the lamp's ivory. The
// handoff carries the previous scene's light one flight further down and
// then hands over to the lamp, which is the point at which warmth stops
// meaning "a machine's service light" and starts meaning "somebody lived
// here".

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  STAIR_X,
  STAIR_HALF_W,
  STAIR_FOOT_Z,
  STAIR_RISE,
  STAIR_RUN,
  STAIR_COUNT,
  STAIR_THRESHOLD_Z,
} from "./layout";

// Cool concrete, a step lighter than the room's charcoal so the amber
// spill has something to land on. Same reasoning as the Graveyard shaft's
// own interior: warm light on warm surfaces resolves to one sepia value
// with nothing to be warm against. Kept identical to GraveyardExit's
// SHAFT_STONE / TREAD_STONE — this is the same stair, and a step in
// albedo across the swap would be a step in value across the swap.
const SHAFT_STONE = "#1e2226";
const TREAD_STONE = "#23282b";
const AMBER = "#c98a4b";

const WALL_T = 0.5;
const SOFFIT_CLEARANCE = 2.9;
const SLOPE = STAIR_RISE / STAIR_RUN;

const X0 = STAIR_X - STAIR_HALF_W;
const X1 = STAIR_X + STAIR_HALF_W;
const TOP_Z = STAIR_FOOT_Z + STAIR_RUN * STAIR_COUNT;
const WALL_TOP_Y = STAIR_RISE * STAIR_COUNT + SOFFIT_CLEARANCE;

// Soffit geometry, derived from the flight rather than authored, so a
// change to the rise or run cannot leave the ceiling behind.
//
// It runs PAST the foot of the flight, down to STAIR_THRESHOLD_Z, and its
// leading edge is the threshold: at that z its underside is 2.57 above
// the room's floor and the camera's eye passes a metre below it, about
// half a second before it settles. That edge replaced a flat head beam
// at 2.6, which was a mistake of exactly the kind this pass exists to
// remove — the camera comes down a 33-degree flight and is above 2.6 for
// almost the whole arrival, so instead of ducking under a threshold it
// spent the descent looking down over the top of a slab into the room.
// A sloped soffit keeps a constant 2.9 above the nosing line, so the
// camera is under it by construction the entire way.
const SOFFIT_T = 0.5;
const SOFFIT_ANGLE = Math.atan2(STAIR_RISE * STAIR_COUNT, STAIR_RUN * STAIR_COUNT);
const SOFFIT_Z0 = STAIR_THRESHOLD_Z - 0.1;
const SOFFIT_Z1 = TOP_Z + 0.6;
const SOFFIT_MID_Z = (SOFFIT_Z0 + SOFFIT_Z1) / 2;
const SOFFIT_MID_Y = SOFFIT_CLEARANCE + SLOPE * (SOFFIT_MID_Z - STAIR_FOOT_Z);
const SOFFIT_LENGTH = Math.hypot(SOFFIT_Z1 - SOFFIT_Z0, SLOPE * (SOFFIT_Z1 - SOFFIT_Z0));

// Ramp-down window for the two spill lights, in arrival progress. They
// are held at full while the camera is still inside the stair and are
// gone by the time it settles, so the room's own lighting is never
// altered by anything in this file.
const SPILL_FADE_START = 0.62;
const SPILL_FADE_END = 0.94;
// Measured down from a first pass at 58/34, which lit the threshold and
// the soffit brightly enough that they became the two largest and
// brightest shapes in the incoming frame — a pale slab across the top of
// the screen rather than a dark stair with light coming up it.
const FOOT_SPILL = 32;
const MID_SPILL = 20;

function Slab({ x0, x1, y0, y1, z0, z1, color = SHAFT_STONE, roughness = 0.96 }) {
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.04} />
    </mesh>
  );
}

export default function MemoriesArrival({ arrival = false, arrivalProgressRef }) {
  const footRef = useRef(null);
  const midRef = useRef(null);

  useFrame(() => {
    const raw = arrival ? THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1) : 1;
    const level = 1 - THREE.MathUtils.smoothstep(raw, SPILL_FADE_START, SPILL_FADE_END);
    if (footRef.current) footRef.current.intensity = FOOT_SPILL * level;
    if (midRef.current) midRef.current.intensity = MID_SPILL * level;
  });

  const steps = [];
  for (let k = 1; k <= STAIR_COUNT; k++) {
    const top = STAIR_RISE * k;
    const front = STAIR_FOOT_Z + STAIR_RUN * (k - 1);
    steps.push(
      <Slab
        key={k}
        x0={X0}
        x1={X1}
        y0={top - 0.62}
        y1={top}
        z0={front}
        z1={front + 0.8}
        color={TREAD_STONE}
        roughness={0.98}
      />,
    );
  }

  return (
    <group>
      {steps}

      {/* Walls. They start at the threshold rather than in the room, so
          nothing of this structure exists forward of where the camera
          settles — at the final pose the nearest of it is 0.2 units
          BEHIND the camera. */}
      <Slab
        x0={X0 - WALL_T}
        x1={X0}
        y0={0}
        y1={WALL_TOP_Y}
        z0={STAIR_THRESHOLD_Z - 0.3}
        z1={TOP_Z + 0.8}
      />
      <Slab
        x0={X1}
        x1={X1 + WALL_T}
        y0={0}
        y1={WALL_TOP_Y}
        z0={STAIR_THRESHOLD_Z - 0.3}
        z1={TOP_Z + 0.8}
      />

      {/* Soffit, parallel to the flight. */}
      <mesh
        position={[
          STAIR_X,
          SOFFIT_MID_Y + (SOFFIT_T / 2) * Math.cos(SOFFIT_ANGLE),
          SOFFIT_MID_Z - (SOFFIT_T / 2) * Math.sin(SOFFIT_ANGLE),
        ]}
        rotation={[-SOFFIT_ANGLE, 0, 0]}
      >
        <boxGeometry args={[STAIR_HALF_W * 2 + WALL_T * 2, SOFFIT_T, SOFFIT_LENGTH]} />
        <meshStandardMaterial color={SHAFT_STONE} roughness={0.96} metalness={0.04} />
      </mesh>

      {/* The threshold: two short returns narrowing the opening to 3.3
          units at the foot of the flight. The head of it is the soffit's
          own leading edge (see the note above SOFFIT_Z0), which the
          camera passes a metre beneath — the last piece of near geometry
          the transition uses. After that there is nothing between the
          visitor and the room. */}
      <Slab
        x0={X0}
        x1={X0 + 0.35}
        y0={0}
        y1={2.45}
        z0={STAIR_THRESHOLD_Z - 0.3}
        z1={STAIR_THRESHOLD_Z + 0.3}
      />
      <Slab
        x0={X1 - 0.35}
        x1={X1}
        y0={0}
        y1={2.45}
        z0={STAIR_THRESHOLD_Z - 0.3}
        z1={STAIR_THRESHOLD_Z + 0.3}
      />

      {/* A bent handrail down one wall — the same utilitarian detail the
          Graveyard's flight carries, because it is the same stair. */}
      <mesh
        position={[X0 + 0.18, SLOPE * (SOFFIT_MID_Z - STAIR_FOOT_Z) + 1.0, SOFFIT_MID_Z]}
        rotation={[-SOFFIT_ANGLE, 0, 0]}
      >
        <boxGeometry args={[0.07, 0.07, SOFFIT_LENGTH - 1.4]} />
        <meshStandardMaterial color="#2f3538" roughness={0.6} metalness={0.55} />
      </mesh>

      {/* The room's light, reaching up the last of the flight. */}
      <pointLight
        ref={footRef}
        position={[STAIR_X - 0.3, 0.9, STAIR_FOOT_Z + 0.4]}
        intensity={FOOT_SPILL}
        distance={11}
        decay={2}
        color={AMBER}
      />
      <pointLight
        ref={midRef}
        position={[STAIR_X, SLOPE * 2.6 + 1.4, STAIR_FOOT_Z + 2.6]}
        intensity={MID_SPILL}
        distance={9}
        decay={2}
        color={AMBER}
      />
    </group>
  );
}
