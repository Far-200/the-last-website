// src/scenes/Memories/MemoriesArchitecture.jsx
//
// Memories' environment: the opposite spatial argument to the Graveyard.
//
// The Graveyard proved its scale by being enormous, horizontal and open,
// with a 1400-unit ground plane and a 58-unit monument the visitor stood
// 70 units away from. This scene proves its scale by being small enough
// to reach. Everything here is authored at human dimensions — a surface
// at 0.75, a wall fragment under three metres, a lamp at arm's length —
// and the camera comes within about two units of the thing it is looking
// at, so the visitor is close to objects rather than dwarfed by them.
//
// ENCLOSURE COMES FROM FOG, NOT FROM GEOMETRY. There is no room here,
// only a corner: two broken wall fragments and a floor. Fog is set tight
// (near 2.5, far 18) against a warm near-black, so anything past the
// immediate few metres dissolves completely and the space reads as
// enclosed without a box ever being built. That is also why this scene
// needs no gradient backdrop sphere the way the Graveyard did — there is
// no horizon to hide, and the fog colour, the canvas clear and the page
// background are all one value.
//
// The fragments are deliberately not a legible room. A literal bedroom
// would date and locate this; broken domestic-scale planes at the edge of
// the light say "someone lived at this scale" without saying who or
// where.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAMP_POSITION } from "./layout";

const FLOOR_Y = 0;

// Warm, drained, and low in value. Pulled down in the correction pass:
// at the first values the table and floor took the lamp's full pool and
// returned a broad orange plane across most of the frame. Darker albedos
// mean the same light describes shape without flooding — the surfaces
// stay dim and the warmth stays a pool rather than a wash. Same
// principle as the Graveyard's ground, run the other direction: there
// the albedo was too dark to receive any light, here it was light enough
// to return too much.
const FLOOR_MAT = "#1f1a17";
const WALL_MAT = "#241e1b";
const WOOD_MAT = "#281f17";
const METAL_MAT = "#201b18";

// Large enough that fog saturates well before any edge: at far = 18 the
// nearest edge is roughly 20 units from the route, so the floor never
// visibly terminates.
const FLOOR_W = 44;
const FLOOR_D = 48;

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, -4]} receiveShadow>
      <planeGeometry args={[FLOOR_W, FLOOR_D]} />
      <meshStandardMaterial color={FLOOR_MAT} roughness={0.96} metalness={0} />
    </mesh>
  );
}

// A wall that stopped being a wall. Built as a run of uneven vertical
// slabs rather than one plane, so its top edge is broken and it reads as
// something that came apart rather than something that was modelled
// short. Nothing is capped or finished — the fog takes the ends.
function BrokenWall({ position, rotation, spans }) {
  return (
    <group position={position} rotation={rotation}>
      {spans.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2, 0]} receiveShadow>
          <boxGeometry args={[s.w, s.h, 0.22]} />
          <meshStandardMaterial color={WALL_MAT} roughness={0.94} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

// The corner. Two fragments meeting at an angle, both under three metres
// — the height is what does the work: a wall the visitor could touch the
// top of is domestic, and a wall that leaves frame is architecture.
const WALL_LEFT = {
  position: [-3.6, FLOOR_Y, -2.2],
  rotation: [0, Math.PI / 2, 0],
  spans: [
    { x: -3.1, w: 1.5, h: 2.35 },
    { x: -1.5, w: 1.6, h: 2.75 },
    { x: 0.25, w: 1.8, h: 2.5 },
    { x: 1.9, w: 1.4, h: 1.75 },
    { x: 3.15, w: 1.0, h: 1.15 },
  ],
};

const WALL_BACK = {
  position: [0.4, FLOOR_Y, -5.1],
  rotation: [0, 0.06, 0],
  spans: [
    { x: -2.6, w: 1.7, h: 1.45 },
    { x: -0.7, w: 2.0, h: 2.6 },
    { x: 1.5, w: 1.9, h: 2.9 },
    { x: 3.4, w: 1.6, h: 2.2 },
  ],
};

// The surface the memory was left on. Low, small, and tipped a little on
// a failed leg — furniture, not architecture.
function Surface() {
  return (
    <group position={[-1.1, FLOOR_Y, -0.6]} rotation={[0, 0.22, 0.018]}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.07, 1.05]} />
        <meshStandardMaterial color={WOOD_MAT} roughness={0.88} metalness={0.03} />
      </mesh>
      {[
        [-0.82, -0.42],
        [0.82, -0.42],
        [-0.82, 0.42],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.36, lz]} castShadow>
          <boxGeometry args={[0.08, 0.72, 0.08]} />
          <meshStandardMaterial color={WOOD_MAT} roughness={0.9} metalness={0.03} />
        </mesh>
      ))}
      {/* The leg that went, lying under the corner it used to hold. */}
      <mesh position={[0.7, 0.05, 0.5]} rotation={[0.1, 0.5, 1.52]} castShadow>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color={WOOD_MAT} roughness={0.9} metalness={0.03} />
      </mesh>
    </group>
  );
}

const LAMP_EMISSIVE_BASE = 2.6;
// Holds through both fragment fades so the lamp is still the last
// visible thing giving the room shape, then dies at "dark" alongside the
// third fragment — the room and the last memory go dark together.
const LAMP_EMISSIVE_BY_PHASE = { dark: 0, leaving: 0 };

// The one practical light in the scene, and the only reason anything here
// is visible. A small shade knocked askew on a box — dirty tungsten,
// still drawing power from whatever keeps the CAPTCHA running. A candle
// in a server room, not a lamp in a home. Its position is shared (see
// layout.js) so MemoriesScene's point light sits inside this shade.
function Lamp({ phase, reduceMotion }) {
  const bulbRef = useRef(null);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const mat = bulbRef.current;
    if (!mat) return;
    const target = LAMP_EMISSIVE_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.05, delta);
    smoothed.current += (target - smoothed.current) * amount;
    mat.emissiveIntensity = LAMP_EMISSIVE_BASE * smoothed.current;
  });

  return (
    <group position={LAMP_POSITION} rotation={[0, 0.5, 0.24]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.19, 0.26, 0.3, 12, 1, true]} />
        <meshStandardMaterial
          color="#3a2f24"
          roughness={0.85}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* The element itself: small, and the brightest thing in Memories
          by a wide margin — but only because everything else is dark. */}
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.075, 10, 8]} />
        <meshStandardMaterial
          ref={bulbRef}
          color="#4a3a26"
          emissive="#e0a259"
          emissiveIntensity={LAMP_EMISSIVE_BASE}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.55, 8]} />
        <meshStandardMaterial color={METAL_MAT} roughness={0.8} metalness={0.25} />
      </mesh>
    </group>
  );
}

// The box the lamp ended up on. One object, no detail — it exists to put
// the light at the right height and to give the pool of warmth something
// to fall across.
function LampCrate() {
  return (
    <mesh
      position={[LAMP_POSITION[0], 0.34, LAMP_POSITION[2]]}
      rotation={[0, 0.36, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.62, 0.68, 0.55]} />
      <meshStandardMaterial color="#2c2520" roughness={0.94} metalness={0} />
    </mesh>
  );
}

export default function MemoriesArchitecture({ phase, reduceMotion }) {
  return (
    <group>
      <Floor />
      <BrokenWall {...WALL_LEFT} />
      <BrokenWall {...WALL_BACK} />
      <Surface />
      <LampCrate />
      <Lamp phase={phase} reduceMotion={reduceMotion} />
    </group>
  );
}
