// src/scenes/Memories/MemoriesResidue.jsx
//
// Environmental population pass for Memories. Feed's density is public
// information and the Graveyard's is dead infrastructure; this is neither
// — it is the residue of one ordinary private life, so nothing here is a
// screen, a sign, or a legible fragment. Everything is a restrained,
// unlit (or barely lit) domestic object: a mug, a notebook, a dropped
// cable, an empty frame. No canvas textures, no emissive materials, no
// interaction, no new memory.
//
// All positions below were checked against MemoriesCamera's actual
// KEYFRAMES/STOPS math (position + look-at lerped and eased exactly as
// that file does it), not eyeballed from a free camera — the route is
// under 9 units end to end with a 42-degree FOV, so an object that looks
// fine from an orbit camera can easily turn out to be off-frame, or
// swinging in front of a hero fragment, at the actual authored stops.
// Two failure modes that check caught and that shaped what follows:
//
//   * A floor-level object needs real depth ahead of the camera to be in
//     frame at all. At entry the camera (y 1.62) looks toward the lamp
//     (y ~0.92) from ~7 units out, a shallow ~6-degree downward pitch —
//     so a foreground prop within about 2 units of the camera sits
//     entirely below the bottom of frame. The entry chair below is
//     placed far enough out to actually be seen.
//   * At the photo stop the camera pitches steeply down (it is looking
//     at something on the floor from 1.5-2 units away), so anything
//     raised to standing height is pitched far above frame — this is why
//     MemoryFragmentPhoto's own header describes abandoning an upright
//     photo for a flat one, and the same constraint applies here: the
//     frame-backing below had to move from "leaning on the wall" to
//     "fallen flat on the floor" before it was ever actually visible
//     during the photo hold.
//
// A candidate "second" distant silhouette (a wardrobe near the voicemail
// wall) was tested and dropped: at any radius large enough to read as
// furniture it either stayed under the entry silhouette's already-taken
// visual role or grew past ~10 degrees of frame — a second one added
// nothing the first doesn't already do. One distant silhouette, verified,
// beats two half-verified ones.

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LAMP_POSITION, MEMORY_POSITION, VOICEMAIL_POSITION, PHOTO_POSITION } from "./layout";

// Same seeded PRNG used throughout the project (Prelude, Feed, the
// Graveyard) for scatter that is deterministic across renders.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function matrixAt(position, rotation, scale) {
  const o = new THREE.Object3D();
  o.position.set(...position);
  o.rotation.set(...rotation);
  o.scale.set(...scale);
  o.updateMatrix();
  return o.matrix.clone();
}

// --- Shared palette -----------------------------------------------------
// Drained browns, greys and near-black only — the same family
// MemoriesArchitecture already uses (FLOOR_MAT/WALL_MAT/WOOD_MAT/
// METAL_MAT). No new hue is introduced anywhere in this file, and nothing
// here carries an emissive value: the lamp is the only warmth in this
// scene, and everything below only reads because that lamp reaches it.
const WOOD = "#241c15";
const FABRIC_PAPER = "#4a4030";
const PAPER_SHADOW = "#2c261d";
const CERAMIC = "#302722";
const METAL_KEY = "#302a24";
const PLASTER = "#332e28";

function useResidueMaterials() {
  const materials = useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.92, metalness: 0.02 }),
      paper: new THREE.MeshStandardMaterial({ color: FABRIC_PAPER, roughness: 0.88, metalness: 0 }),
      paperShadow: new THREE.MeshStandardMaterial({ color: PAPER_SHADOW, roughness: 0.9, metalness: 0 }),
      ceramic: new THREE.MeshStandardMaterial({ color: CERAMIC, roughness: 0.55, metalness: 0.05 }),
      key: new THREE.MeshStandardMaterial({ color: METAL_KEY, roughness: 0.4, metalness: 0.45 }),
      plaster: new THREE.MeshStandardMaterial({ color: PLASTER, roughness: 1, metalness: 0 }),
      cable: new THREE.MeshStandardMaterial({ color: "#151210", roughness: 0.85, metalness: 0.05 }),
    }),
    [],
  );

  useLayoutEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return materials;
}

// Shared geometries for shapes that repeat across clusters (a flat paper
// scrap, a short cable segment, a plaster crumb) so those clusters don't
// each allocate their own copy.
function useResidueGeometries() {
  return useMemo(
    () => ({
      scrap: new THREE.BoxGeometry(0.22, 0.012, 0.16),
      cableSeg: new THREE.CylinderGeometry(0.018, 0.018, 0.36, 5),
      crumb: new THREE.BoxGeometry(1, 1, 1),
    }),
    [],
  );
}

// --- Entry: sparse, establishing -----------------------------------------
// Verified against the full route: a foreground silhouette that sinks out
// of the bottom of frame as the camera closes on it (t ~0-0.2, never past
// ~18 degrees of arc, never overlapping the lamp or the device), and one
// distant, small-angular-size (3.5-8 degree) shape past the corner where
// the two broken walls give out — read as "the room continues, then
// fog," not as a second hero.
function EntryResidue({ materials }) {
  return (
    <group>
      {/* A chair that went over, on its side, off the direct line to the
          lamp. Four boxes: seat, two remaining legs, one snapped stub —
          convincing silhouette, no detail worth spending geometry on
          since it is only ever seen at a distance and an angle. */}
      <group position={[-1.0, 0, 1.7]} rotation={[0.1, 0.6, 1.42]}>
        <mesh material={materials.wood} castShadow>
          <boxGeometry args={[0.42, 0.04, 0.4]} />
        </mesh>
        <mesh position={[-0.16, 0.22, -0.16]} rotation={[0, 0, 0.05]} material={materials.wood}>
          <cylinderGeometry args={[0.018, 0.018, 0.42, 6]} />
        </mesh>
        <mesh position={[0.16, 0.22, -0.16]} rotation={[0, 0, -0.04]} material={materials.wood}>
          <cylinderGeometry args={[0.018, 0.018, 0.42, 6]} />
        </mesh>
        <mesh position={[-0.16, 0.22, 0.16]} rotation={[0, 0, 0.08]} material={materials.wood}>
          <cylinderGeometry args={[0.018, 0.018, 0.16, 6]} />
        </mesh>
        {/* Backrest, snapped and trailing off to one side. */}
        <mesh position={[0, 0.34, -0.2]} rotation={[0, 0.2, 0.3]} material={materials.wood}>
          <boxGeometry args={[0.38, 0.03, 0.06]} />
        </mesh>
      </group>

      {/* A slim cabinet-scale silhouette well past where the walls break
          off. Kept narrow rather than boxy so its projected size stays
          modest across the whole window it is visible in (checked:
          3.5-8 degrees of arc from t=0 through the approach to the
          table, never a slab). */}
      <group position={[-4.8, 0, -6.3]} rotation={[0, 0.3, 0.06]}>
        <mesh position={[0, 0.65, 0]} material={materials.wood} receiveShadow>
          <boxGeometry args={[0.5, 1.3, 0.36]} />
        </mesh>
        <mesh position={[0, 1.34, 0.02]} rotation={[0.06, 0, 0.1]} material={materials.wood}>
          <boxGeometry args={[0.46, 0.06, 0.32]} />
        </mesh>
      </group>
    </group>
  );
}

// --- Table / lamp: the densest readable cluster --------------------------
// Kept OFF the tabletop wherever the brief's own refinement said to: the
// table carries only the hero device, a mug, and a small paper stack (plus
// a tiny key detail) — loose paper and the lamp's cable continuation sit
// on the floor instead. Every table item's world position was solved in
// the table's own rotated local frame (Surface() in MemoriesArchitecture
// yaws the whole group 0.22 rad) so nothing floats off the tilted top, and
// each was checked against MEMORY_POSITION across the full route: both sit
// on the far (from-camera) side of the device at the stop1 dwell, so nothing
// sits between the camera and the hero at the shot that matters. (A closer
// pass during the fast transit to the voicemail stop grazes the lamp/table
// cluster at under a metre for a couple of frames regardless of what's
// there — the lamp and crate themselves are that close then too — so that
// is the route's own geometry, not something an item placement fixes.)
const TABLE_TOP_Y = 0.775;

function TableResidue({ materials, geometries }) {
  return (
    <group>
      {/* Mug: cylinder body + a thin bent handle. Sits on the lamp side of
          the table, behind the device from the stop1 viewing angle. */}
      <group position={[-1.69, TABLE_TOP_Y + 0.065, -0.72]} rotation={[0, 0.4, 0]}>
        <mesh material={materials.ceramic} castShadow>
          <cylinderGeometry args={[0.075, 0.07, 0.13, 10]} />
        </mesh>
        <mesh position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.ceramic}>
          <torusGeometry args={[0.05, 0.014, 6, 10, Math.PI * 1.3]} />
        </mesh>
      </group>

      {/* Small paper stack, standing in for a notebook: two thin sheets,
          slightly offset, on the far side of the table from the camera. */}
      <group position={[-0.62, TABLE_TOP_Y + 0.012, -0.96]} rotation={[0, -0.25, 0]}>
        <mesh material={materials.paper} castShadow>
          <boxGeometry args={[0.3, 0.018, 0.22]} />
        </mesh>
        <mesh position={[0.02, 0.02, -0.015]} rotation={[0, 0.08, 0]} material={materials.paperShadow}>
          <boxGeometry args={[0.27, 0.014, 0.19]} />
        </mesh>
      </group>

      {/* A tiny key ring near the table's near edge — small enough to
          read only as a glint, not a shape, which is the point: a highlight
          off the lamp rather than geometry that needs resolving. */}
      <group position={[-1.66, TABLE_TOP_Y + 0.01, -0.12]} rotation={[Math.PI / 2, 0, 0.4]}>
        <mesh material={materials.key}>
          <torusGeometry args={[0.045, 0.008, 5, 10]} />
        </mesh>
        <mesh position={[0.05, 0.03, 0]} rotation={[0, 0, 0.6]} material={materials.key}>
          <boxGeometry args={[0.07, 0.018, 0.006]} />
        </mesh>
        <mesh position={[0.06, -0.02, 0]} rotation={[0, 0, -0.3]} material={materials.key}>
          <boxGeometry args={[0.06, 0.016, 0.006]} />
        </mesh>
      </group>

      {/* Loose paper moved off the tabletop and onto the floor, near
          where the table's own failed leg (see Surface() in
          MemoriesArchitecture) already lies. geometries.scrap is
          authored already thin-along-Y (a flat sheet lying on the
          ground plane), so only yaw and a hair of tilt are needed here
          — no "stand it up then lay it down" rotation. */}
      <mesh
        position={[-0.4, 0.012, -0.15]}
        rotation={[0.06, 0.3, 0.03]}
        material={materials.paper}
        geometry={geometries.scrap}
        receiveShadow
      />
      <mesh
        position={[-0.55, 0.014, -0.32]}
        rotation={[-0.04, -0.5, -0.05]}
        scale={[0.8, 0.8, 0.8]}
        material={materials.paperShadow}
        geometry={geometries.scrap}
        receiveShadow
      />

      {/* The lamp's own cord, trailing off the crate and stopping on the
          floor rather than running anywhere legible — a personal-scale
          detail, not an infrastructure line. */}
      <mesh
        position={[-2.15, 0.02, -0.95]}
        rotation={[Math.PI / 2, 0, 0.5]}
        material={materials.cable}
        geometry={geometries.cableSeg}
      />
      <mesh
        position={[-1.9, 0.02, -0.68]}
        rotation={[Math.PI / 2, 0, 1.15]}
        scale={[1, 1, 0.75]}
        material={materials.cable}
        geometry={geometries.cableSeg}
      />

      {/* A broken shelf plank still jutting from the left wall, close
          enough to the lamp to catch its light without ever crossing the
          sightline to either the lamp or the device (checked). */}
      <mesh position={[-3.25, 1.5, -1.3]} rotation={[0, 0.05, -0.13]} material={materials.wood} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.06, 0.4]} />
      </mesh>

      {/* Plaster at the wall/floor junction below it. */}
      <mesh position={[-3.35, 0.03, -1.42]} rotation={[0.03, 0.4, 0.02]} material={materials.plaster} receiveShadow>
        <boxGeometry args={[0.5, 0.06, 0.4]} />
      </mesh>
    </group>
  );
}

// --- Voicemail: found among the remains of a failed corner ---------------
// Every position here was checked against VOICEMAIL_POSITION across the
// full route: the crate sits behind the machine from every angle it
// shares a frame with it, and the loose paper/coiled cable never enter
// its silhouette at the stop2 dwell.
function VoicemailResidue({ materials, geometries }) {
  return (
    <group>
      {/* Low crate the machine is partly set against. */}
      <mesh position={[-3.0, 0.16, -2.3]} rotation={[0, 0.5, 0]} material={materials.wood} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.32, 0.34]} />
      </mesh>

      {/* The machine's own dead cord, coiled where it was left rather
          than running anywhere — it used to reach a wall that no longer
          reads as a wall with an outlet in it. */}
      <group position={[-2.7, 0.015, -2.8]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={materials.cable}>
          <torusGeometry args={[0.13, 0.016, 6, 14, Math.PI * 1.6]} />
        </mesh>
        <mesh position={[0.1, -0.09, 0]} rotation={[0, 0, 0.4]} material={materials.cable} geometry={geometries.cableSeg} scale={[1, 1, 0.6]} />
      </group>

      {/* Paper knocked loose nearby. Same already-flat geometry as the
          table cluster's floor scraps — yaw and a hair of tilt only. */}
      <mesh
        position={[-2.85, 0.012, -2.65]}
        rotation={[0.04, 0.6, -0.03]}
        material={materials.paper}
        geometry={geometries.scrap}
        receiveShadow
      />

      {/* Plaster drift along the wall base — the wall failed here, and
          this is what's left of it on the floor. */}
      <mesh position={[-3.4, 0.05, -3.2]} rotation={[0.02, 0.3, 0.03]} material={materials.plaster} receiveShadow>
        <boxGeometry args={[0.85, 0.1, 0.7]} />
      </mesh>
    </group>
  );
}

// --- Photo: the quietest composition --------------------------------------
// Deliberately nothing authored here. An empty fallen frame-backing near
// PHOTO_POSITION, and separately a plaster crumb and a floor value-break,
// were all built and checked against an actual render (not just the
// frustum math) before being dropped: this corner sits roughly 5 units
// from the lamp, well past where the point light's falloff and the
// hemisphere fill still add up to anything — every material tried here,
// including one deliberately lifted several steps lighter than every
// other surface in this file, rendered as flat, undifferentiated black,
// even boosted 8x in a diagnostic screenshot. That is not "a dim
// silhouette" (which the brief explicitly allows), it is nothing: geometry
// sitting in the scene graph and contributing zero visible pixels. Since
// "do not widen the lighting" and "do not add emissive materials" are both
// hard constraints for this pass, and the photo fragment's own header
// already documents that IT only reads at this distance because it carries
// its own emissive, there is no way to make an inert prop near the photo
// visible without breaking one of those two rules. Given that, an empty
// composition here is not a missed opportunity, it is the correct answer:
// "maximum negative space" already describes exactly what a real render of
// this spot looks like. See MicroDebris's SCRAP_ZONES for how the general
// floor scatter is kept clear of this same neighbourhood for the same
// reason, rather than scattering more invisible geometry into it.

// --- Micro-debris: instanced, biased, never uniform -----------------------
// Two instancedMesh draw calls carry every tiny scrap in the scene. Bias
// mirrors the density progression: heaviest near the table/lamp and the
// voicemail wall (the two damaged/lived-in corners), a light scattering
// through the rest of the floor, deliberately sparse along the direct
// entry-to-lamp sightline (x within ~0.9 of the route centreline) and
// minimal near the photo. Each zone is a rectangular jitter around a
// centre, not a radial scatter, which is enough irregularity at this
// object scale without needing per-point exclusion geometry. A small
// clearance check keeps every instance off the four hero positions and
// the lamp itself, so nothing tiny ever renders on top of a hero surface.
const CLEARANCE_POINTS = [MEMORY_POSITION, VOICEMAIL_POSITION, PHOTO_POSITION, LAMP_POSITION];
const CLEARANCE_R = 0.4;

function clearOfHeroes(x, z) {
  for (const p of CLEARANCE_POINTS) {
    const dx = x - p[0];
    const dz = z - p[2];
    if (dx * dx + dz * dz < CLEARANCE_R * CLEARANCE_R) return false;
  }
  return true;
}

// In the direct sightline the camera holds from entry toward the lamp —
// kept thin along the approach so it never reads as scattered clutter in
// the one shot that is supposed to read as empty.
function inEntryCorridor(x, z) {
  return z > 0 && z < 5.4 && Math.abs(x - 0.2) < 0.9;
}

// Same "too far from the lamp to render as anything but flat black" zone
// PhotoResidue's own removal is documented against above — a wider
// clearance than CLEARANCE_R alone gives, since the finding there wasn't
// "don't sit exactly on the hero," it was "nothing this dim resolves to
// visible pixels anywhere in this pocket of the room."
const PHOTO_DEAD_ZONE_R = 1.8;
function nearPhotoDeadZone(x, z) {
  const dx = x - PHOTO_POSITION[0];
  const dz = z - PHOTO_POSITION[2];
  return dx * dx + dz * dz < PHOTO_DEAD_ZONE_R * PHOTO_DEAD_ZONE_R;
}

// { cx, cz, rx, rz, count } — rectangular jitter zones, weighted by count
// rather than area, so the table/lamp and voicemail corners carry most of
// the field without the rest of the floor reading as empty by contrast.
const SCRAP_ZONES = [
  { cx: -1.7, cz: -1.0, rx: 1.5, rz: 1.3, count: 9 },
  { cx: -2.9, cz: -2.6, rx: 1.3, rz: 1.1, count: 8 },
  { cx: -0.5, cz: -3.2, rx: 2.6, rz: 1.6, count: 5 },
  { cx: 0.4, cz: 2.6, rx: 2.2, rz: 2.0, count: 4 },
];

const FLECK_ZONES = [
  { cx: -2.8, cz: -2.5, rx: 1.2, rz: 1.2, count: 8 },
  { cx: -1.8, cz: -0.9, rx: 1.3, rz: 1.2, count: 6 },
  { cx: -0.8, cz: 0.6, rx: 2.0, rz: 1.8, count: 4 },
];

// `shape(rand, scale)` returns the final [sx, sy, sz] applied on top of
// the instance's base geometry — kept as a callback because the two
// debris kinds start from differently-authored base geometries
// (`geometries.scrap` is already a flat sheet; `geometries.crumb` is a
// bare unit cube) and so need different final proportions, even though
// the placement/bias logic above is identical for both.
function buildDebris(zones, seed, sizeRange, shape) {
  const rand = mulberry32(seed);
  const matrices = [];
  for (const zone of zones) {
    let placed = 0;
    let attempts = 0;
    while (placed < zone.count && attempts < zone.count * 6) {
      attempts++;
      const x = zone.cx + (rand() - 0.5) * 2 * zone.rx;
      const z = zone.cz + (rand() - 0.5) * 2 * zone.rz;
      if (!clearOfHeroes(x, z) || inEntryCorridor(x, z) || nearPhotoDeadZone(x, z)) continue;
      const scale = sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0]);
      matrices.push(
        matrixAt(
          [x, 0.004 + rand() * 0.008, z],
          [(rand() - 0.5) * 0.25, rand() * Math.PI, (rand() - 0.5) * 0.25],
          shape(rand, scale),
        ),
      );
      placed++;
    }
  }
  return matrices;
}

function MicroDebris({ materials, geometries }) {
  const scrapRef = useRef(null);
  const fleckRef = useRef(null);

  const { scrapMatrices, fleckMatrices } = useMemo(
    () => ({
      // geometries.scrap is already a flat 0.22x0.012x0.16 sheet — a
      // uniform scale keeps that sheet's proportions at varying sizes.
      scrapMatrices: buildDebris(SCRAP_ZONES, 51501, [0.5, 1.2], (_rand, s) => [s, s, s]),
      // geometries.crumb is a bare unit cube, so it needs its own
      // non-uniform flattening (same idea as FeedDebris's own scatter) to
      // read as a small chip rather than a brick — absolute size kept
      // well under the authored plaster drifts (0.06-0.1 tall) so these
      // stay strictly background-scale.
      fleckMatrices: buildDebris(FLECK_ZONES, 63021, [0.05, 0.11], (rand, s) => [
        s,
        s * (0.35 + rand() * 0.3),
        s * (0.6 + rand() * 0.6),
      ]),
    }),
    [],
  );

  useLayoutEffect(() => {
    if (scrapRef.current) {
      scrapMatrices.forEach((m, i) => scrapRef.current.setMatrixAt(i, m));
      scrapRef.current.instanceMatrix.needsUpdate = true;
    }
    if (fleckRef.current) {
      fleckMatrices.forEach((m, i) => fleckRef.current.setMatrixAt(i, m));
      fleckRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [scrapMatrices, fleckMatrices]);

  // frustumCulled disabled for the same reason FeedDebris/GraveyardMemorials
  // document: instancedMesh's default bounding sphere comes from the base
  // geometry, not the spread of instances, so culling it risks the
  // instances vanishing entirely at some camera angles. Two draw calls for
  // ~35 specks total is negligible either way. No castShadow: these are too
  // small for a shadow to read against the lamp's one shadow-casting light.
  return (
    <>
      <instancedMesh
        ref={scrapRef}
        args={[geometries.scrap, materials.paperShadow, scrapMatrices.length]}
        frustumCulled={false}
        receiveShadow
      />
      <instancedMesh
        ref={fleckRef}
        args={[geometries.crumb, materials.plaster, fleckMatrices.length]}
        frustumCulled={false}
        receiveShadow
      />
    </>
  );
}

export default function MemoriesResidue() {
  const materials = useResidueMaterials();
  const geometries = useResidueGeometries();

  return (
    <group>
      <EntryResidue materials={materials} />
      <TableResidue materials={materials} geometries={geometries} />
      <VoicemailResidue materials={materials} geometries={geometries} />
      {/* No PhotoResidue: see the comment above where it used to be. */}
      <MicroDebris materials={materials} geometries={geometries} />
    </group>
  );
}
