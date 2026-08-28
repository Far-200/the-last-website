// src/scenes/Graveyard/GraveMarkerField.jsx
//
// First integration of an authored Blender asset kit into the project —
// a VISUAL TEST PASS, not the final population. The one question this
// component exists to answer is whether the kit's meshes survive the
// real Graveyard camera, fog, lighting, scale and movement, so it drops
// a small authored group of markers into ONE representative stretch of
// the existing route (z ~= -116 to -200) and changes nothing else.
//
// Source: public/models/graveyard/grave_marker_kit_01.glb
//   GEO_Grave_Slab_A   0.80 x 1.25 x 0.32   standard headstone
//   GEO_Grave_Slab_B   0.72 x 1.62 x 0.20   taller, thinner slab
//   GEO_Grave_Block_A   1.00 x 0.96 x 0.68   chunky low block
//   GEO_Grave_Fragment_A 0.66 x 1.35 x 0.50  broken shard
//   GEO_Grave_Thin_A   0.59 x 1.45 x 0.13   thin plate
//   GEO_Grave_Hero_A   1.16 x 2.08 x 0.82   tall marker with a structural
//                                           void broken out of its head
// All six sit at origin with base at y = 0 and no node transform, so
// each renders straight onto a group placed at groundHeightAt(x, z).
//
// Loading
// -------
// useGLTF (drei's cached GLTFLoader wrapper, the project's first use of
// it) loads the kit once. We then read geometry and material references
// straight off the loaded scene graph and never mutate those shared
// nodes: every instance is an ordinary <mesh> that REFERENCES the shared
// BufferGeometry and a small set of shared materials. Sharing a
// read-only BufferGeometry across meshes is standard three practice and,
// unlike an InstancedMesh, keeps a correct per-instance bounding sphere
// so frustum culling stays honest (see FeedDebris / the memorial filler
// field for why that distinction matters here). 21 test objects do not
// justify an instancing system; the final pass can add one.
//
// Scale
// -----
// The kit is authored at literal ~1-2 m headstone scale. The Graveyard's
// own markers were deliberately sized 3-5 units to hold their own beside
// 9-20 unit relay towers (see GraveyardMemorials pass 1 — smaller than
// that and a grave "reads as a pebble of debris"). KIT_BASE_SCALE lifts
// the imports into that same vocabulary; the brief's 0.90-1.12 per-marker
// variation then rides on top of it.
//
// Material
// --------
// MAT_DeadStone imports at linear albedo ~(0.052, 0.060, 0.055) — within
// a hair of GraveyardArchitecture's GROUND_STONE (~0.033-0.048 linear)
// and roughly half the value GraveyardMemorials had to push its stone to
// (the STONE_B/STONE_A family, ~0.09-0.14 linear) before graves read at
// all under this scene's single dim hemisphere term plus one grazing
// key. Left unchanged, these markers would sit at the documented
// "vanishes into the ground plane" value. The one adjustment made here is
// therefore albedo, and only albedo: each GLB material is cloned and its
// colour set to the scene's already-solved marker stone, matching
// GraveyardMemorials rather than inventing a new value. Roughness,
// metalness (0) and the KHR specular/IOR terms are kept exactly as
// authored. No emissive, no map, no glow — the environment lights these.
//
// Placement
// ---------
// MARKERS below is hand-authored, deterministic data in the same spirit
// as heroMemorials / TOWERS / RACKS — no Math.random at render, no
// procedural scatter. It is grouped into deliberate visual layers along
// the authored camera route (the camera travels -z and looks down its
// own heading, converging on the monument only late):
//
//   A  foreground silhouettes, close to the route at z ~ -124..-127,
//      entering frame from the sides as the camera passes
//   B  a midground rank on the open right (+x) side, z ~ -134..-168,
//      uneven spacing, one deliberately tight pair, then a gap
//   C  a denser back group on the far left, z ~ -153..-188, partly
//      eclipsed by the standing tower at (-52, -150) and by layer B
//   D  a few sparse distant markers near the route's far end
//   H  two GEO_Grave_Hero_A: H1 a readable midground silhouette off to
//      the right, H2 deep and turned away so it stays subordinate
//
// Every position was checked for clearance against the hero memorials
// (graveyardRelics.js), the frozen-spinner relic, the standing tower and
// the fidget-spinner grave so nothing new intersects existing narrative
// geometry. Lateral offsets sit in the lanes between GraveyardMemorials'
// PLOT_SLOTS so the additions read as part of the same field rather than
// fighting it.

import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { groundHeightAt } from "./groundHeight";

const KIT_URL = "/models/graveyard/grave_marker_kit_01.glb";

// See header. One multiplier, applied to every instance before its own
// 0.90-1.12 variation, to bring 1-2 m Blender stock into the scene's
// 3-5 unit marker scale.
const KIT_BASE_SCALE = 2.3;

// Albedo lift only (see header). Values taken from GraveyardMemorials'
// solved STONE family; fracture faces stay a touch lighter, preserving
// the GLB's authored intent that a fresh break is less weathered.
const STONE_BODY = "#586369";
const STONE_FRACTURE = "#69726f";

// How far each instance's base is tucked below the sampled ground so it
// reads as planted, not resting on a plane. Individual entries override
// this for the shards, which sit deeper.
const DEFAULT_SINK = 0.06;

// ─────────────────────────────────────────────────────────────────────
// TEMPORARY — GLB VISUAL-ISOLATION PASS. NOT a production change.
//
// Flip to `false` (single edit) to fully restore normal rendering. While
// `true`:
//   * GraveyardMemorials hides ONLY its anonymous FillerGraves field.
//     Hero memorials and every narrative structure (towers, relics,
//     racks, 404 slab, CAPTCHA, warm cue) stay exactly as they are.
//   * This component ADDITIONALLY renders DEBUG_INSPECTION_MARKERS — a
//     near/midground line-up of all six kit meshes along the opening
//     stretch of the route, so each authored Blender silhouette can be
//     read directly in the live scene.
//
// The authored MARKERS array below is untouched by this flag. Nothing
// here changes camera, fog, lighting, progression, the phase machine,
// the CAPTCHA or any transition. Revert = set this to `false` and remove
// the matching import in GraveyardMemorials.jsx.
export const DEBUG_ISOLATE_GLB_MARKERS = true;

// Kept out of the render path: resolves the six named source objects to
// flat lists of { geometry, material } parts, cloning each GLB material
// exactly once and recolouring it. Five of the six meshes carry two
// primitives (dead stone + fracture); traversing each node covers both
// the Group and the single-Mesh cases without special-casing.
function useKitParts() {
  const { scene } = useGLTF(KIT_URL);

  return useMemo(() => {
    const materialCache = new Map();
    const resolveMaterial = (source) => {
      if (!materialCache.has(source.uuid)) {
        const cloned = source.clone();
        cloned.color = new THREE.Color(
          source.name === "MAT_Fracture" ? STONE_FRACTURE : STONE_BODY,
        );
        materialCache.set(source.uuid, cloned);
      }
      return materialCache.get(source.uuid);
    };

    const parts = {};
    for (const node of scene.children) {
      const list = [];
      node.traverse((object) => {
        if (object.isMesh) {
          list.push({ geometry: object.geometry, material: resolveMaterial(object.material) });
        }
      });
      parts[node.name] = list;
    }
    return parts;
  }, [scene]);
}

// One authored marker. `lean` is an [x, z] tilt in radians, same
// convention as TOWERS / heroMemorials; `rotY` is an explicit heading —
// these markers carry no engraving, so unlike the hero memorials they do
// not need to face the route.
const MARKERS = [
  // --- A: foreground silhouettes ------------------------------------
  { id: "a-thin-l", type: "GEO_Grave_Thin_A", pos: [-33, -126], rotY: 0.62, scale: 1.08, lean: [0.03, 0.08] },
  { id: "a-slab-r", type: "GEO_Grave_Slab_A", pos: [-16, -129], rotY: -0.7, scale: 1.05, lean: [0.05, -0.07] },
  { id: "a-block-near", type: "GEO_Grave_Block_A", pos: [-30, -124], rotY: 1.1, scale: 1.06, sink: 0.2 },

  // --- B: midground rank on the open right side --------------------
  { id: "b-slab-1", type: "GEO_Grave_Slab_A", pos: [-8.6, -134], rotY: 0.3, scale: 1.04, lean: [0.02, 0.04] },
  { id: "b-slabB-2", type: "GEO_Grave_Slab_B", pos: [-4, -140], rotY: -0.25, scale: 0.98, lean: [0.03, -0.05] },
  { id: "b-block-3", type: "GEO_Grave_Block_A", pos: [-9, -146], rotY: 0.85, scale: 1.0 },
  // Deliberately tight pair: one upright slab and a broken shard beside
  // it, turned apart, different heights so they do not merge.
  { id: "b-slab-4", type: "GEO_Grave_Slab_A", pos: [-2, -150], rotY: 0.95, scale: 1.02 },
  { id: "b-frag-5", type: "GEO_Grave_Fragment_A", pos: [-3.6, -152.4], rotY: 1.6, scale: 0.9, sink: 0.28, lean: [0.06, 0.1] },
  { id: "b-slabB-6", type: "GEO_Grave_Slab_B", pos: [3, -163], rotY: -0.4, scale: 1.06, lean: [0.05, 0.11] },
  { id: "b-thin-7", type: "GEO_Grave_Thin_A", pos: [-6, -168], rotY: 0.15, scale: 1.0 },
  // gap: right side is left empty from z ~ -170 to -182

  // --- C: denser back group, far left, tower-eclipsed --------------
  { id: "c-slab-1", type: "GEO_Grave_Slab_A", pos: [-37, -153], rotY: 0.5, scale: 1.0 },
  { id: "c-slabB-2", type: "GEO_Grave_Slab_B", pos: [-38, -161], rotY: -0.35, scale: 1.05, lean: [0.03, 0.08] },
  { id: "c-block-3", type: "GEO_Grave_Block_A", pos: [-36, -168], rotY: 1.0, scale: 0.98 },
  { id: "c-slab-4", type: "GEO_Grave_Slab_A", pos: [-39, -177], rotY: -0.6, scale: 1.02 },
  { id: "c-frag-5", type: "GEO_Grave_Fragment_A", pos: [-37.5, -184], rotY: 2.0, scale: 0.85, sink: 0.3, lean: [0.05, 0.12] },
  // Sits directly behind the standing tower on many camera bearings.
  { id: "c-frag-6", type: "GEO_Grave_Fragment_A", pos: [-52, -166], rotY: 0.2, scale: 0.9, sink: 0.24 },

  // --- D: sparse distant markers near the route's far end ----------
  { id: "d-thin-1", type: "GEO_Grave_Thin_A", pos: [-2, -190], rotY: 0.3, scale: 0.95 },
  { id: "d-slabB-2", type: "GEO_Grave_Slab_B", pos: [-25, -196], rotY: -0.4, scale: 0.98, lean: [0.04, 0.09] },
  { id: "d-slab-3", type: "GEO_Grave_Slab_A", pos: [14, -193], rotY: 0.6, scale: 0.92 },

  // --- H: the two hero markers ------------------------------------
  // H1 — readable midground silhouette, off to the right, its broken
  // head roughly toward the passing camera.
  { id: "h-1", type: "GEO_Grave_Hero_A", pos: [0, -157], rotY: -1.9, scale: 1.0, lean: [0.03, 0.04] },
  // H2 — deep, small, turned away: present but never the subject.
  { id: "h-2", type: "GEO_Grave_Hero_A", pos: [-33, -197], rotY: 1.4, scale: 0.95, lean: [0.02, 0.05] },
];

// TEMPORARY (see DEBUG_ISOLATE_GLB_MARKERS above). A single receding row
// on the open right side of the OPENING stretch of the route — where the
// camera moves slowly and passes close — so every kit silhouette can be
// inspected: all six meshes, no scale variation, no lean, distinct Y
// rotations to present each shape at a useful angle. Cleared for
// clearance against the early hero memorials (planking / vine /
// harlemshake), the two foreground relics, the standing tower and the
// first server rack. This is inspection scaffolding, NOT production
// placement — do not fold these into MARKERS.
const DEBUG_INSPECTION_MARKERS = [
  { id: "dbg-slabA", type: "GEO_Grave_Slab_A", pos: [-20, -34], rotY: 0.35, scale: 1.0 },
  { id: "dbg-blockB", type: "GEO_Grave_Block_A", pos: [-27, -41], rotY: -1.6, scale: 1.0 },
  { id: "dbg-slabB", type: "GEO_Grave_Slab_B", pos: [-25, -48], rotY: -0.5, scale: 1.0 },
  { id: "dbg-block", type: "GEO_Grave_Block_A", pos: [-18, -56], rotY: 0.8, scale: 1.0 },
  { id: "dbg-frag", type: "GEO_Grave_Fragment_A", pos: [-25, -64], rotY: 1.4, scale: 1.0 },
  { id: "dbg-thin", type: "GEO_Grave_Thin_A", pos: [-16, -72], rotY: -0.9, scale: 1.0 },
  { id: "dbg-hero", type: "GEO_Grave_Hero_A", pos: [-22, -86], rotY: 2.1, scale: 1.0 },
  { id: "dbg-slabA2", type: "GEO_Grave_Slab_A", pos: [-17, -98], rotY: 0.5, scale: 1.0 },
];

function GraveMarker({ marker, parts }) {
  const pieces = parts[marker.type];
  const [x, z] = marker.pos;
  const y = groundHeightAt(x, z) - (marker.sink ?? DEFAULT_SINK);
  const [leanX, leanZ] = marker.lean ?? [0, 0];
  const s = KIT_BASE_SCALE * marker.scale;

  return (
    <group position={[x, y, z]} rotation={[leanX, marker.rotY, leanZ]} scale={s}>
      {pieces.map((piece, i) => (
        <mesh key={i} geometry={piece.geometry} material={piece.material} />
      ))}
    </group>
  );
}

function GraveMarkerFieldContent() {
  const parts = useKitParts();
  return (
    <group>
      {MARKERS.map((marker) => (
        <GraveMarker key={marker.id} marker={marker} parts={parts} />
      ))}
      {/* TEMPORARY inspection line-up — see DEBUG_ISOLATE_GLB_MARKERS. */}
      {DEBUG_ISOLATE_GLB_MARKERS &&
        DEBUG_INSPECTION_MARKERS.map((marker) => (
          <GraveMarker key={marker.id} marker={marker} parts={parts} />
        ))}
    </group>
  );
}

export default function GraveMarkerField() {
  // useGLTF suspends; nothing else in the scene does, so give it its own
  // boundary and let the rest of the Graveyard paint immediately.
  return (
    <Suspense fallback={null}>
      <GraveMarkerFieldContent />
    </Suspense>
  );
}

useGLTF.preload(KIT_URL);
