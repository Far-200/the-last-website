// src/scenes/Prelude/PreludeEnvironment.jsx
//
// The room the Prelude's console is standing in.
//
// Why this exists
// ---------------
// The Prelude's 3D layer was a ground plane, the CRT, 22 sub-20cm debris
// boxes and dust. At the authored camera pose (see PreludeScene's
// CAMERA_BY_PHASE / LOOK_AT) that produced frames with no foreground, no
// overhead structure and no background at all — every narrative beat was
// carried by DOM typography and the world behind it was, measurably,
// black. This file is the physical place; PreludeScene still owns the
// camera, the fog and every light.
//
// Everything here is static authored geometry. No useFrame, no state, no
// lights, no shadow casters. It cannot compete with CameraResponse's
// camera authority, AmbientLight's phase easing, or LeavingDolly's
// exclusive leaving-phase ownership of the camera, fog and lights.
//
// Composed against the frustum, not from a free camera
// ----------------------------------------------------
// The camera sits at (0, 1.85, 6.2) looking at (0.3, 0.72, 0) at fov 42,
// so it is pitched ~10 degrees down and yawed ~3 degrees right. At 16:9
// the horizontal half-angle gives tan ~0.68 and the vertical tan ~0.38.
// Four consequences drove every number below:
//
//   * The floor only enters frame from about z = 3 and then fills the
//     bottom half of every shot, so the floor is the surface that
//     actually needs the value work — not the walls.
//   * Near-camera space is a narrow window: at z = 4 the frame is only
//     ~3 units wide. A foreground occluder therefore has to sit off to
//     one side and be allowed to leave the frame, rather than presenting
//     its whole shape politely in the middle.
//   * "Overhead" here means y 2.6-3.4, not a distant ceiling — the top of
//     frame only reaches y ~3.1 at z = 0 and y ~3.8 at z = -3.
//   * Fog is #020202 near 5 / far 14 (owned by PreludeScene, unchanged),
//     so distance darkens toward black instead of paling. Depth reads as
//     near-lighter / far-darker, and nothing past about z = -8 survives
//     at all.
//
// Albedo is ramped AGAINST that fog
// ---------------------------------
// Because the haze is darker than the geometry, a constant albedo would
// collapse every depth band into the same near-black. The values below
// therefore get LIGHTER with distance (foreground ~#262c2e, midground
// ~#3a4245, background ~#525c60), which is what keeps three separable
// value bands on screen once fog has taken its cut. This is the same
// lesson GraveyardArchitecture's GROUND_STONE comment records from the
// other direction: albedo is not brightness, and only the render says
// whether a surface is present.
//
// DOM safety
// ----------
// The Prelude's typography is the strongest thing in the scene and this
// file must not fight it. Screen-space regions kept deliberately clear of
// new mass: the packet dump (x 17-44%, y 16-44%), the centred SYSTEM
// reveal and the ARCHIVE document (x 36-69%, y 25-75%), and the
// bottom-centre CTA. New geometry is pushed into the lower-left, the
// upper-right and the top edge — the three regions no frame's copy ever
// occupies.

import { useEffect, useMemo } from "react";
import * as THREE from "three";

// --- Value ramp -------------------------------------------------------
// Named by the depth band they belong to, not by the material they
// imagine themselves to be, because the band is what decides the number.
// The foreground mass has to be MUCH darker than the floor it sits on,
// not merely dark. A first pass matched it to the sub-floor value and the
// wreck vanished — it was in frame, correctly placed, and had no
// silhouette because there was nothing for its edge to be an edge
// against. A near-camera occluder is defined entirely by that contrast.
const NEAR_HULL = "#12171a";
const NEAR_TRIM = "#20272a";
const MID_HULL = "#313839";
const FAR_HULL = "#444d51"; // background stacks, fog eats most of this
const SLOT_VOID = "#080b0c"; // recessed slots / open cavities
// Floor tones sit deliberately CLOSE to PreludeScene's sub-floor (#171b1d).
// Two corrections are folded in here. A first pass ran them 2.5x above the
// sub-floor, which turned every tile into a hard-edged bright quad and the
// floor read as sheets of paper dropped on a plane. A second pass fixed
// the alignment but left the values high enough that the floor was still
// the brightest large area in frame — it out-valued the console, which is
// the one object the composition is supposed to be about. The floor is
// now roughly half its previous return: present, readable, and firmly
// subordinate. Console primacy is a VALUE relationship before it is
// anything else.
const PLATE_A = "#2b3134";
const PLATE_B = "#262c2e";
const PLATE_C = "#1f2426";
const SKIRT = "#0a0e0f"; // grounding shadow stand-in — see Skirt below
// The fallen partition behind the text band. Deliberately the darkest lit
// surface in the room — DARKER than the floor — because its whole job is
// to be something the typography sits against rather than something the
// eye looks at. See FallenPartition below.
const PANEL_FACE = "#1a1f21";
const PANEL_RAIL = "#2a3234";

function useEnvironmentMaterials() {
  const materials = useMemo(
    () => ({
      nearHull: new THREE.MeshStandardMaterial({ color: NEAR_HULL, roughness: 0.94, metalness: 0.08 }),
      nearTrim: new THREE.MeshStandardMaterial({ color: NEAR_TRIM, roughness: 0.86, metalness: 0.14 }),
      midHull: new THREE.MeshStandardMaterial({ color: MID_HULL, roughness: 0.9, metalness: 0.1 }),
      farHull: new THREE.MeshStandardMaterial({ color: FAR_HULL, roughness: 0.92, metalness: 0.06 }),
      slot: new THREE.MeshStandardMaterial({ color: SLOT_VOID, roughness: 0.98, metalness: 0 }),
      panel: new THREE.MeshStandardMaterial({ color: PANEL_FACE, roughness: 0.97, metalness: 0.03 }),
      panelRail: new THREE.MeshStandardMaterial({ color: PANEL_RAIL, roughness: 0.84, metalness: 0.16 }),
      plateA: new THREE.MeshStandardMaterial({ color: PLATE_A, roughness: 0.95, metalness: 0.04 }),
      plateB: new THREE.MeshStandardMaterial({ color: PLATE_B, roughness: 0.96, metalness: 0.04 }),
      plateC: new THREE.MeshStandardMaterial({ color: PLATE_C, roughness: 0.96, metalness: 0.04 }),
      skirt: new THREE.MeshStandardMaterial({ color: SKIRT, roughness: 1, metalness: 0 }),
    }),
    [],
  );

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return materials;
}

// One reusable unit plane / unit box so the ~50 meshes here share two
// geometries instead of allocating their own.
function useEnvironmentGeometry() {
  const geometry = useMemo(
    () => ({ box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1) }),
    [],
  );

  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);

  return geometry;
}

// A dark plane laid on the floor under a standing form.
//
// This is a grounding device, not a real shadow. The scene's one
// shadow-casting light is a DirectionalLight whose default orthographic
// shadow camera only covers roughly +-5 units, while this environment
// spans +-8 — so half of it could never receive a correct cast shadow,
// and widening that camera would cost shadow resolution everywhere for a
// contact darkening that reads at RGB 10-20 anyway. FeedInfrastructure's
// DebrisClusters already solves the same problem the same way.
function Skirt({ geometry, material, position, size, rotation = 0 }) {
  return (
    <mesh
      geometry={geometry.plane}
      material={material}
      position={[position[0], 0.006, position[1]]}
      rotation={[-Math.PI / 2, 0, rotation]}
      scale={[size[0], size[1], 1]}
    />
  );
}

// --- Floor ------------------------------------------------------------
// A raised access floor, part collapsed. This is the single highest-value
// element in the room: the floor occupies the bottom half of every
// authored frame, and before this it was one continuous unbroken value.
//
// It is an ALIGNED grid, and that is the correction from the first pass.
// Laying irregular quads at small individual rotations produced scattered
// sheets, not a floor — the eye reads misaligned edges as loose objects.
// An access floor is a grid in reality, and here the grid earns its keep
// twice: the seams converge with the perspective and give the lower half
// of every frame a direction to recede in, and the tiles that are MISSING
// are what carry the decay. Irregularity comes from absence and from the
// one panel that has come up, never from jitter.
//
// Tiles are thin boxes rather than planes so each seam is a real recess
// with a lit lip on one side. At zero thickness the boundaries were
// hairlines and read as paint.
const TILE = 3.0;
const PITCH = 3.22; // the 0.22 difference is the seam
const TILE_H = 0.055;

// [col, row, tone]; world x = col * PITCH, z = row * PITCH. Gaps in this
// table are the collapsed bays — the sub-floor shows through them.
const FLOOR_TILES = [
  [-2, 1, "plateB"], [0, 1, "plateA"], [1, 1, "plateC"], [2, 1, "plateB"],
  [-2, 0, "plateA"], [-1, 0, "plateC"], [0, 0, "plateB"], [1, 0, "plateC"],
  [-1, -1, "plateB"], [0, -1, "plateA"], [1, -1, "plateC"], [2, -1, "plateB"],
  [-2, -2, "plateC"], [-1, -2, "plateA"], [0, -2, "plateB"], [2, -2, "plateA"],
];
// Deliberately absent: (-1, 1) where the wreck came through, (2, 0),
// (-2, -1) and (1, -2). The two tiles nearest the console — (1, 0) and
// (1, -1) — are both the darkest tone, so the CRT's cyan spill has an
// unlit surface to pool on. Cyan is the scarcest thing in this scene and
// the room light must not be allowed to wash the one place it lands.

// One panel pulled out of its frame and left leaning against the wreck.
// A first pass laid a full-size tile at a shallow angle, which at this
// camera projected as a large pale trapezoid and read as a ramp — a
// piece of architecture, which is the opposite of what a lifted floor
// panel means. Small, steep and in the darkest tone: it is a detail
// caught at the edge of the near mass, not a second structure.
const LIFTED_TILE = {
  position: [-2.9, 0.52, 2.55],
  rotation: [0.15, 0.35, 1.05],
  size: [1.5, 0.07, 1.35],
};

// --- Foreground: the toppled rack, lower left -------------------------
// One collapsed mass, biased hard to one side and allowed to leave frame
// on the left. Its right end crops into shot at about 23% of screen width
// and its top stays under 55% of screen height, which clears the packet
// dump above it and the centre column entirely.
//
// It is the darkest thing in the room by albedo (NEAR_HULL) because it is
// also the closest and therefore the least fogged: reading as a true
// silhouette against the lit floor behind it is the whole job. The open
// end faces the camera so there is one identifying feature — this is
// equipment, not a rock.
// Pulled in from x -2.35 after the first render put almost all of it past
// the left frame edge: at this camera the frame is only ~3 units wide at
// z = 4, so a foreground mass loses shot far faster than its world
// position suggests. It still leaves frame on the left — that is the
// point — but its broken end now crops in at about a fifth of the way
// across, where it can actually be read.
const FG_ORIGIN = [-2.1, 0, 3.3];
const FG_YAW = 0.34;

// Blades spilling out of the broken end, at the angles they stopped at.
const FG_BLADES = [
  { position: [1.16, 0.44, 0.28], rotation: [0.06, -0.22, 0.14], size: [0.62, 0.07, 0.78] },
  { position: [1.32, 0.2, -0.16], rotation: [-0.1, 0.3, -0.24], size: [0.55, 0.06, 0.72] },
  { position: [1.05, 0.72, -0.02], rotation: [0.12, 0.1, 0.34], size: [0.5, 0.06, 0.7] },
];

function ForegroundWreck({ geometry, materials }) {
  return (
    <group position={FG_ORIGIN} rotation={[0, FG_YAW, 0]}>
      {/* Rack body, on its side. */}
      <mesh
        geometry={geometry.box}
        material={materials.nearHull}
        position={[0, 0.55, 0]}
        rotation={[0.03, 0, 0.04]}
        scale={[3.0, 1.1, 1.25]}
      />
      {/* The broken end, opened toward the camera — a recessed void, so
          the near end of the mass is a hole rather than a flat cap. */}
      <mesh
        geometry={geometry.box}
        material={materials.slot}
        position={[1.43, 0.55, 0]}
        rotation={[0.03, 0, 0.04]}
        scale={[0.3, 0.9, 1.05]}
      />
      {FG_BLADES.map((b, i) => (
        <mesh
          key={i}
          geometry={geometry.box}
          material={materials.nearTrim}
          position={b.position}
          rotation={b.rotation}
          scale={b.size}
        />
      ))}
      {/* A side panel that came away and is leaning back against it, and
          a rail still bolted to the body. Both are positioned to rise
          ABOVE the body's own top edge: without them the wreck presents
          as one long straight diagonal, which at this size reads as a
          ramp rather than as something that fell over. They are the
          silhouette, and the silhouette is the whole contribution of an
          object this dark. */}
      <mesh
        geometry={geometry.box}
        material={materials.nearHull}
        position={[0.42, 1.02, 0.7]}
        rotation={[0.38, -0.3, 0.5]}
        scale={[1.75, 1.3, 0.07]}
      />
      <mesh
        geometry={geometry.box}
        material={materials.nearTrim}
        position={[-0.95, 1.18, -0.34]}
        rotation={[0.12, 0.18, -0.3]}
        scale={[1.55, 0.09, 0.09]}
      />
      {/* A second stub rail, shorter and at a different angle, so the top
          edge breaks twice rather than once. */}
      <mesh
        geometry={geometry.box}
        material={materials.nearTrim}
        position={[0.05, 1.14, -0.5]}
        rotation={[0.2, -0.12, 0.34]}
        scale={[0.85, 0.08, 0.08]}
      />
    </group>
  );
}

// --- Debris: two authored compositions, not a scatter -----------------
// Both sit where something actually failed — spilled out of the wreck's
// broken end, and drifted at the foot of the stacks behind the console.
// Everything between those two points is left bare, which is what makes
// them read as evidence rather than as decoration.
const DEBRIS_SPILL = [
  { position: [-0.72, 0.14, 3.05], rotation: [0.3, 0.5, 0.2], size: [0.44, 0.26, 0.36] },
  { position: [-0.24, 0.1, 2.62], rotation: [-0.2, 0.9, 0.42], size: [0.32, 0.19, 0.44] },
  { position: [-1.05, 0.09, 2.35], rotation: [0.14, -0.4, 0.6], size: [0.38, 0.17, 0.3] },
  { position: [-0.05, 0.16, 3.35], rotation: [0.4, 0.2, -0.3], size: [0.5, 0.3, 0.28] },
  { position: [-1.55, 0.07, 1.95], rotation: [0.08, 1.1, 0.16], size: [0.3, 0.13, 0.36] },
  { position: [0.35, 0.06, 2.9], rotation: [-0.1, 0.35, 0.5], size: [0.26, 0.11, 0.3] },
];

const DEBRIS_DRIFT = [
  { position: [3.55, 0.18, -1.55], rotation: [0.16, 0.4, 0.22], size: [0.58, 0.34, 0.46] },
  { position: [4.25, 0.12, -1.05], rotation: [-0.12, 0.8, -0.3], size: [0.42, 0.23, 0.5] },
  { position: [2.95, 0.1, -2.05], rotation: [0.24, -0.3, 0.44], size: [0.36, 0.2, 0.34] },
  { position: [4.7, 0.2, -1.95], rotation: [0.06, 0.55, 0.12], size: [0.62, 0.38, 0.4] },
  { position: [3.05, 0.07, -0.95], rotation: [0.3, 1.2, -0.18], size: [0.3, 0.14, 0.38] },
];

// --- Overhead: the broken brace --------------------------------------
// One memorable shape, entering the top edge around 16% of screen width
// and exiting the right edge around a fifth of the way down, so it cuts
// the upper-right corner diagonally and passes over nothing but the
// perimeter HUD. It stops the world reading as objects on a floor in a
// void, and it does it with silhouette rather than with light.
//
// The span is deliberately longer than the frame is wide (x -8 to +6) so
// both ends leave shot: a brace that fits inside the frame reads as a
// prop, a brace that doesn't reads as structure.
function OverheadBrace({ geometry, materials }) {
  return (
    <group>
      {/* Main span, dropping toward the right where it has failed. */}
      <mesh
        geometry={geometry.box}
        material={materials.midHull}
        position={[-1.1, 2.86, -1.45]}
        rotation={[0, 0.12, -0.115]}
        scale={[13.6, 0.34, 0.52]}
      />
      {/* A short section snapped clear of the break and hanging from it —
          the one place the brace shows that it is broken rather than
          merely tilted. */}
      <mesh
        geometry={geometry.box}
        material={materials.midHull}
        position={[3.65, 2.02, -1.15]}
        rotation={[0.18, 0.06, 0.92]}
        scale={[1.7, 0.28, 0.44]}
      />
      {/* Conduit still hanging off the break, dropping toward the
          console. Placed at x 3.5 so it lands around 80% of screen width,
          clear of the ARCHIVE document's right edge at 69%. */}
      <mesh
        geometry={geometry.box}
        material={materials.midHull}
        position={[3.42, 1.62, -1.34]}
        rotation={[0.05, 0, 0.12]}
        scale={[0.09, 2.1, 0.09]}
      />
      <mesh
        geometry={geometry.box}
        material={materials.midHull}
        position={[3.62, 0.86, -1.24]}
        rotation={[0.3, 0.2, 0.7]}
        scale={[0.07, 1.0, 0.07]}
      />
    </group>
  );
}

// --- The fallen partition: a surface for the text to exist on ---------
//
// This is the answer to the single loudest note in review — that the
// Prelude read as UI floating over a semi-transparent 3D layer. The cause
// was not the typography, which is strong, and not its brightness. It was
// that the screen region the copy occupies (the packet dump upper-left,
// the SYSTEM reveal and the ARCHIVE document through the centre) had
// NOTHING BEHIND IT. Text over a fogged void reads as text over a void
// however good the rest of the room is; text over a surface reads as
// something recovered onto that surface.
//
// So: a partition wall that came down and is leaning toward the camera at
// about 23 degrees, sized and angled so its face covers screen y 12-56%
// across the left and centre — exactly the band all three phases put copy
// in. Two slabs of different height give it a broken top edge, and a rail
// down one edge says "partition", not "monolith".
//
// It is the DARKEST lit surface in the room by some margin, below even
// the floor. That is deliberate and load-bearing: a bright surface behind
// the copy would have traded one legibility problem for a worse one. It
// only has to be distinguishable from the fogged black around it, and at
// roughly RGB 5 against RGB 0-2 it is.
//
// Height is capped at 2.8 so its top passes UNDER the overhead brace at
// y 2.86 rather than through it, and its right edge stops short of x 1
// so it never encroaches on the console at x 2.3.
function FallenPartition({ geometry, materials }) {
  return (
    <group position={[-0.9, 0, -1.9]} rotation={[-0.4, 0.18, 0.05]}>
      <mesh
        geometry={geometry.box}
        material={materials.panel}
        position={[-1.15, 1.4, 0]}
        scale={[2.6, 2.8, 0.22]}
      />
      <mesh
        geometry={geometry.box}
        material={materials.panel}
        position={[0.85, 1.05, 0.03]}
        scale={[2.1, 2.1, 0.2]}
      />
      {/* Frame rail down the outer edge — the one element with enough
          metalness to catch the raking key, so the partition has a lit
          edge and does not present as a flat rectangle of value. */}
      <mesh
        geometry={geometry.box}
        material={materials.panelRail}
        position={[-2.42, 1.3, 0.14]}
        scale={[0.13, 2.6, 0.15]}
      />
      {/* A section of the same partition that broke off and is lying at
          its foot, so the wall reads as fallen rather than as built at
          this angle. */}
      <mesh
        geometry={geometry.box}
        material={materials.panel}
        position={[1.55, 0.18, 0.62]}
        rotation={[0.42, -0.3, 0.16]}
        scale={[1.5, 0.16, 1.2]}
      />
    </group>
  );
}

// --- Background: the rest of the chamber -----------------------------
// Six forms in three deliberate groups, not a spread: a tight leaning
// cluster on the left, a broken pair standing behind the console on the
// right, and one low wide bulkhead across the centre distance.
//
// The centre form is the one carrying the SYSTEM frame. It is
// deliberately LOW and WIDE rather than tall — a horizontal dark mass
// gives "THE INTERNET IS GONE." something to sit against without
// competing with it for the middle of the frame, and the taller flanks
// either side of it close the composition in.
//
// Heights, widths, spacing and lean are all uneven, and one form in each
// group is broken, so nothing here resolves into a repeating rhythm.
const BACKGROUND_FORMS = [
  // Left cluster — tallest, tightest, one leaning into its neighbour.
  { position: [-4.25, -4.3], size: [1.5, 3.5, 1.2], yaw: 0.35, lean: 0.05, slots: 4, tone: "farHull" },
  { position: [-2.85, -5.25], size: [1.15, 2.4, 1.05], yaw: -0.22, lean: 0, slots: 3, tone: "farHull" },
  { position: [-5.75, -4.85], size: [1.75, 2.05, 1.35], yaw: 0.62, lean: -0.1, slots: 0, tone: "farHull" },

  // Centre distance — low, wide, the SYSTEM frame's backing.
  { position: [-0.5, -6.1], size: [5.4, 1.85, 0.95], yaw: 0.07, lean: 0, slots: 0, tone: "farHull" },

  // Right pair, BESIDE the console rather than behind it. Both were
  // originally pushed inboard to x 3.25 / 5.55, which put a lit slotted
  // rack face directly behind the CRT — the one object in the scene that
  // has to read as the last thing still powered was silhouetted against
  // another machine of almost the same value, and its cyan had nothing to
  // be scarce against. Shifted out so the volume immediately behind the
  // console is open, fogged and dark, and the pair still closes the upper
  // right with a gap of deeper dark between them.
  { position: [4.5, -3.15], size: [1.8, 3.05, 1.3], yaw: -0.2, lean: 0.03, slots: 5, tone: "midHull" },
  { position: [6.5, -2.75], size: [1.7, 2.25, 1.2], yaw: -0.46, lean: 0.09, slots: 3, tone: "midHull" },
];

// A slot band reads as a rack at distance in a way a plain box never
// does, and it is the cheapest identifying feature available: three to
// five thin recessed darks on the camera-facing side.
function BackgroundForm({ geometry, materials, form }) {
  const [x, z] = form.position;
  const [w, h, d] = form.size;
  const material = materials[form.tone];

  const slots = [];
  for (let i = 0; i < form.slots; i++) {
    const sy = h * (0.24 + (0.58 * i) / Math.max(1, form.slots - 1));
    slots.push(
      <mesh
        key={i}
        geometry={geometry.box}
        material={materials.slot}
        position={[0, sy, d / 2]}
        scale={[w * 0.74, h * 0.055, 0.06]}
      />,
    );
  }

  return (
    <group position={[x, 0, z]} rotation={[0, form.yaw, form.lean]}>
      <mesh geometry={geometry.box} material={material} position={[0, h / 2, 0]} scale={[w, h, d]} />
      {slots}
    </group>
  );
}

export default function PreludeEnvironment() {
  const materials = useEnvironmentMaterials();
  const geometry = useEnvironmentGeometry();

  return (
    <group>
      {/* Floor tiles. Laid before everything else so the standing forms
          and the wreck read against them rather than against the dark
          sub-floor. */}
      {FLOOR_TILES.map(([col, row, tone]) => (
        <mesh
          key={`tile-${col}-${row}`}
          geometry={geometry.box}
          material={materials[tone]}
          position={[col * PITCH, TILE_H / 2, row * PITCH]}
          scale={[TILE, TILE_H, TILE]}
          receiveShadow
        />
      ))}

      <mesh
        geometry={geometry.box}
        material={materials.plateC}
        position={LIFTED_TILE.position}
        rotation={LIFTED_TILE.rotation}
        scale={LIFTED_TILE.size}
      />

      <Skirt
        geometry={geometry}
        material={materials.skirt}
        position={[-2.2, 3.2]}
        size={[4.6, 2.6]}
        rotation={0.3}
      />
      <ForegroundWreck geometry={geometry} materials={materials} />

      {DEBRIS_SPILL.map((d, i) => (
        <mesh
          key={`spill-${i}`}
          geometry={geometry.box}
          material={materials.nearHull}
          position={d.position}
          rotation={d.rotation}
          scale={d.size}
        />
      ))}

      {DEBRIS_DRIFT.map((d, i) => (
        <mesh
          key={`drift-${i}`}
          geometry={geometry.box}
          material={materials.midHull}
          position={d.position}
          rotation={d.rotation}
          scale={d.size}
        />
      ))}

      <OverheadBrace geometry={geometry} materials={materials} />
      <FallenPartition geometry={geometry} materials={materials} />

      {BACKGROUND_FORMS.map((form, i) => (
        <group key={`bg-${i}`}>
          <Skirt
            geometry={geometry}
            material={materials.skirt}
            position={form.position}
            size={[form.size[0] * 1.9, form.size[2] * 2.1]}
            rotation={form.yaw}
          />
          <BackgroundForm geometry={geometry} materials={materials} form={form} />
        </group>
      ))}
    </group>
  );
}
