// src/scenes/Graveyard/GraveMarkerField.jsx
//
// The final authored cemetery field, built from the Blender grave-marker
// kit. This replaces the earlier 21-object visual test pass, whose only
// job was to prove the kit's meshes survived the real Graveyard camera,
// fog, lighting and scale. They did; this is the population.
//
// It is the SECOND grave layer in the scene and it is deliberately not a
// duplicate of the first. GraveyardMemorials owns the burial ground
// proper: twelve engraved hero graves plus an instanced filler field laid
// out as transverse rows on fixed plot slots 9.5-35.5 units either side
// of the route. That layer establishes "this is a cemetery". This layer
// does the three things a regular plot grid structurally cannot:
//
//   * NEAR LANE. The filler's innermost slot is 9.5 units off the route.
//     Markers here sit at 5-8 units, close enough to sweep across the
//     frame edge as the camera passes, which is where the scene's
//     foreground parallax comes from.
//   * INTERSTITIAL POCKETS. Uneven clusters in the lanes BETWEEN the
//     filler's plot slots, so the field reads as something that grew and
//     subsided rather than as a maintained grid.
//   * DEEP FIELD. Everything past 38 units, which the filler never
//     populates at all, out to ~90 units off-route and ~120 units beyond
//     the monument. This is the layer that says the cemetery is much
//     larger than the walk through it.
//
// Source: public/models/graveyard/grave_marker_kit_01.glb
//   GEO_Grave_Slab_A   0.80 x 1.25 x 0.32   standard headstone
//   GEO_Grave_Slab_B   0.72 x 1.62 x 0.20   taller, thinner slab
//   GEO_Grave_Block_A   1.00 x 0.96 x 0.68   chunky low block
//   GEO_Grave_Fragment_A 0.66 x 1.35 x 0.50  broken shard
//   GEO_Grave_Thin_A   0.59 x 1.45 x 0.13   thin plate
//   GEO_Grave_Hero_A   1.16 x 2.08 x 0.82   tall marker with a structural
//                                           void broken out of its head
// All six sit at origin with base at y = 0 and no node transform, so a
// marker is just a transform applied to the raw mesh.
//
// Loading and draw cost
// ---------------------
// useGLTF (drei's cached GLTFLoader wrapper) loads the kit once. Geometry
// and material references are read straight off the loaded scene graph
// and those shared nodes are never mutated.
//
// The test pass rendered each marker as its own <mesh> and explicitly
// deferred instancing ("21 test objects do not justify an instancing
// system; the final pass can add one"). At ~110 markers, five of the six
// kit meshes carrying two primitives each, that would now be ~215 draw
// calls for roughly 11k triangles — cost entirely in submission, not in
// geometry, and the one thing in this file that would actually be felt on
// a phone. Markers are therefore batched into ONE InstancedMesh per
// (kit mesh, primitive): 11 draw calls total, same geometry, same
// materials, identical shading.
//
// frustumCulled is off on all of them for the reason FillerGraves
// documents: an instanced field spread across ~500 units has no honest
// single bounding sphere derived from its base geometry, and a false
// invisible is a far worse failure here than 11 unconditional draw calls.
//
// Scale
// -----
// The kit is authored at literal ~1-2 m headstone scale. The Graveyard's
// own markers were deliberately sized 3-5 units to hold their own beside
// 9-20 unit relay towers (see GraveyardMemorials pass 1 — smaller than
// that and a grave "reads as a pebble of debris"). KIT_BASE_SCALE lifts
// the imports into that same vocabulary; per-marker variation rides on
// top of it.
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
// Composition
// -----------
// Placement is AUTHORED ZONES plus seeded variation, never a scatter: a
// hand-written table of clusters, each with its own anchor, footprint,
// population, marker mix, scale range, lean amount and mean heading, then
// expanded once at module load by the project's usual mulberry32 so the
// field is byte-identical on every reload. Individually placed accents —
// the five hero markers and one foreground shard — are authored outright.
//
// The clusters are grouped into five beats along the route, and the shape
// of the walk is in their spacing, not in a density function:
//
//   1 ARRIVAL      z +7..-44   Four small groups, none near the route,
//                              large empty ground between them. The
//                              cemetery is present but distant.
//   2 EARLY        z -44..-112 Loose pockets appear on both sides and the
//                              first near-lane shards; the first deep
//                              silhouette group opens up on the left.
//   3 MID          z -112..-204 The oppressive stretch. Near-lane ruin,
//                              two mid ranks, a thicket, and deep groups
//                              at 38-46 units off-route on both flanks,
//                              so foreground, midground and fog layers
//                              overlap continuously.
//   4 APPROACH     z -204..-300 Density stays on the FLANKS while the
//                              centre opens (see the clearing, below).
//   5 BEYOND       z -300..-392 Groups behind and either side of the
//                              monument, out to x +88 and x -78, so the
//                              field continues past the point the visitor
//                              can walk to and dissolves into fog.
//
// Protecting the CAPTCHA
// ----------------------
// The monument is the hero image and the closing frame belongs to it.
// CLEARING_STATIONS below are the camera's actual positions over the last
// third of the route (t = 0.70, 0.80, 0.90, 1.00, taken from
// GraveyardCamera's own curve, not estimated), and the wedge from each of
// them to the monument's front-face edges is kept empty of anything
// nearer than CLEARING_NEAR. Past that distance a 3-5 unit marker
// subtends under a tenth of the monument's 39 degrees and reads as graves
// at its feet, which is framing rather than obstruction — the same read
// the filler field's own final section already produces.
//
// This was verified rather than assumed: the layout was run through a
// numeric port of GraveyardCamera's exact math at 400 points along the
// route and both aspect ratios, projecting every marker's bounding box
// against the monument's. Across the whole reveal window (t >= 0.62, when
// GraveyardCaptcha starts lifting its emissive) no marker in this file
// crosses the monument's silhouette above its bottom 14%. Occlusion
// EARLIER than that is deliberate and belongs to the fallen towers and
// the frozen spinner, which exist to make the machine something the
// visitor loses and re-finds; nothing here is allowed to add to it.
//
// The same simulation fixes the rest of the guards: no marker comes
// closer than 4.5 units to the camera curve (they sweep the frame edge,
// they never intersect it), and 109 of the 110 are on screen at some
// point on a desktop aspect.

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { groundHeightAt, routeXAt } from "./groundHeight";
import { heroMemorials } from "../../data/graveyardRelics";
import { eraMemorials, ERA_MEMORIAL_CLEARANCE } from "../../data/graveyardEpitaphs";
import { EXIT_OBSTACLE, ARCHIVE_MOUTH_OBSTACLE } from "./exitLayout";

// Exported so GraveyardScene can hang its readiness signal off the same
// asset. See the AssetGate note there: the arrival clock must not start
// until the kit has actually parsed, or 110 markers pop in behind it.
export const KIT_URL = "/models/graveyard/grave_marker_kit_01.glb";

// See header. One multiplier, applied to every instance before its own
// per-marker variation, to bring 1-2 m Blender stock into the scene's
// 3-5 unit marker scale.
const KIT_BASE_SCALE = 2.3;

// Albedo lift only (see header). Values taken from GraveyardMemorials'
// solved STONE family; fracture faces stay a touch lighter, preserving
// the GLB's authored intent that a fresh break is less weathered.
//
// The gap between the two was widened in the readability pass. With the
// scene's new lateral rake (GraveyardScene) there is finally light
// arriving at an angle that a break face can respond to differently from
// a weathered one, and the two families reading as one value was part of
// why 110 markers looked like 110 copies of the same cut-out.
const STONE_BODY = "#586369";
const STONE_FRACTURE = "#79827d";

// The GLB authors both families at roughness 0.93 / 0.985 — effectively
// pure matte, which under a grazing light produces no edge at all. Only
// the FRACTURE family is lowered, and only to 0.72: a broad, dull sheen
// on freshly broken faces, nowhere near glossy, so a shard catches a weak
// cold highlight along its break while the weathered body stays dead.
const FRACTURE_ROUGHNESS = 0.72;

// Per-instance value multiplier (InstancedMesh.setColorAt), applied on
// top of the shared albedo. This is the cheapest possible way to stop the
// field being one flat tone — it costs no draw call and no material — and
// it is what makes a cluster read as many stones of different ages rather
// than one stone stamped out repeatedly.
const TINT_MIN = 0.82;
const TINT_RANGE = 0.4;
// Small directional bias on top of the random spread, so value itself
// carries a little depth: markers in the near lane sit slightly above the
// field's average and the deep-field markers sit below it, reinforcing
// near -> mid -> fog instead of fighting it.
const TINT_NEAR_LANE = 1.1;
const TINT_DEEP_FIELD = 0.88;

// How far each instance's base is tucked below the sampled ground so it
// reads as planted, not resting on a plane. Clusters of shards override
// this with a deeper value.
const DEFAULT_SINK = 0.06;

// Same seeded PRNG used throughout the project (Prelude, Feed,
// GraveyardMemorials). The field is expanded exactly once, at module
// load, so the composition is identical on every reload and every
// machine.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SLAB_A = "GEO_Grave_Slab_A";
const SLAB_B = "GEO_Grave_Slab_B";
const BLOCK = "GEO_Grave_Block_A";
const FRAGMENT = "GEO_Grave_Fragment_A";
const THIN = "GEO_Grave_Thin_A";
const HERO = "GEO_Grave_Hero_A";

// Marker vocabulary by role, weighted by repetition. A cluster draws from
// one of these, so a group has a character — a rank of tall thin stones,
// a drift of broken shards, a knot of heavy blocks — instead of every
// group being the same even mixture of all six meshes.
//
// GEO_Grave_Hero_A appears in NONE of them. It is placed only by hand,
// five times in the whole field, which is what keeps it dominant.
const MIX = {
  // ordinary population rhythm
  common: [SLAB_A, SLAB_A, SLAB_A, SLAB_A, THIN, THIN, BLOCK],
  // broken remains: low, deep-sunk, heavily leaned
  ruined: [FRAGMENT, FRAGMENT, FRAGMENT, FRAGMENT, BLOCK, BLOCK, SLAB_A],
  // upright rank: the silhouette layer
  rank: [SLAB_B, SLAB_B, SLAB_B, THIN, THIN, SLAB_A, SLAB_A, BLOCK],
  // weight and midground mass
  mass: [BLOCK, BLOCK, BLOCK, SLAB_A, SLAB_A, FRAGMENT],
  // everything at once, for the crowded stretches
  thicket: [SLAB_A, SLAB_A, SLAB_A, SLAB_B, SLAB_B, THIN, THIN, BLOCK, BLOCK, FRAGMENT, FRAGMENT],
  // read at distance through fog: taller bodies, no shards
  far: [SLAB_B, SLAB_B, SLAB_B, SLAB_A, SLAB_A, SLAB_A, THIN, BLOCK],
};

// One authored cluster.
//
//   lane / z    anchor given as a signed offset from the route centreline
//               at that z (negative = the -x side). Lane values are
//               chosen to fall BETWEEN GraveyardMemorials' plot slots.
//   at          absolute [x, z] anchor instead, for the groups past the
//               end of the route where "offset from the route" stops
//               meaning anything.
//   count       markers wanted; a cluster may end up one short where the
//               guards below reject its footprint, which is fine.
//   spread      [lateral, along-route] half-extents of the footprint.
//               Route-relative clusters are narrow and long, which is
//               what keeps them inside their lane.
//   scale       per-marker multiplier on KIT_BASE_SCALE.
//   lean        0 = upright, 1 = collapsing. Scaled to ~0.16 rad.
//   yaw / jitter mean heading and its spread. These markers carry no
//               engraving, so unlike the hero memorials they do not need
//               to face the route; a shared mean heading per cluster is
//               what makes a group read as one plot rather than as
//               unrelated stones.
const CLUSTERS = [
  // --- 1 ARRIVAL: sparse, off the route, wide empty ground -----------
  { id: "a1", lane: 6.0, z: 2, count: 2, spread: [2.2, 5], mix: MIX.ruined, scale: [0.82, 0.98], lean: 0.9, yaw: 0.5, jitter: 1.4, sink: 0.26 },
  { id: "a2", lane: -13.5, z: -14, count: 2, spread: [2.0, 7], mix: MIX.common, scale: [0.9, 1.05], lean: 0.5, yaw: -0.3, jitter: 0.5 },
  { id: "a3", lane: 24, z: -38, count: 2, spread: [2.4, 8], mix: MIX.common, scale: [0.88, 1.04], lean: 0.4, yaw: 0.25, jitter: 0.5 },
  { id: "a4", lane: -26, z: -50, count: 2, spread: [3.0, 9], mix: MIX.mass, scale: [0.92, 1.08], lean: 0.35, yaw: 0.9, jitter: 0.6 },

  // --- 2 EARLY: pockets on both sides, first near-lane shards --------
  { id: "b1", lane: 6.5, z: -58, count: 2, spread: [1.6, 5], mix: MIX.ruined, scale: [0.8, 0.95], lean: 1.0, yaw: 1.2, jitter: 1.5, sink: 0.24 },
  { id: "b2", lane: 12.2, z: -66, count: 3, spread: [1.4, 7], mix: MIX.common, scale: [0.9, 1.06], lean: 0.35, yaw: 0.18, jitter: 0.35 },
  { id: "b3", lane: -18, z: -72, count: 2, spread: [2.0, 8], mix: MIX.rank, scale: [0.92, 1.1], lean: 0.5, yaw: -0.4, jitter: 0.5 },
  { id: "b4", lane: -31.5, z: -92, count: 2, spread: [3.2, 11], mix: MIX.mass, scale: [0.92, 1.12], lean: 0.4, yaw: 0.7, jitter: 0.8 },
  { id: "b5", lane: 31, z: -110, count: 3, spread: [2.6, 9], mix: MIX.common, scale: [0.9, 1.08], lean: 0.4, yaw: -0.2, jitter: 0.6 },
  // First group beyond the filler field's outermost plot slot: the point
  // at which the cemetery stops having a visible far edge.
  { id: "b6", lane: -44, z: -100, count: 2, spread: [4.0, 14], mix: MIX.far, scale: [1.0, 1.18], lean: 0.3, yaw: 0.4, jitter: 0.9 },

  // --- 3 MID: the oppressive stretch, layered in depth ---------------
  // c1 / c4 / c9 are the near lane — low, broken, deep-sunk, and close
  // enough to the route to leave frame as the camera passes them.
  { id: "c1", lane: -6.5, z: -126, count: 2, spread: [1.4, 6], mix: MIX.ruined, scale: [0.78, 0.94], lean: 1.1, yaw: -1.0, jitter: 1.6, sink: 0.3 },
  { id: "c2", lane: 12.5, z: -132, count: 5, spread: [1.5, 8], mix: MIX.common, scale: [0.92, 1.08], lean: 0.4, yaw: 0.15, jitter: 0.4 },
  { id: "c3", lane: -18.5, z: -148, count: 4, spread: [1.8, 9], mix: MIX.rank, scale: [0.95, 1.14], lean: 0.45, yaw: -0.35, jitter: 0.45 },
  { id: "c4", lane: 7.2, z: -168, count: 3, spread: [1.3, 6], mix: MIX.ruined, scale: [0.8, 0.96], lean: 1.0, yaw: 0.9, jitter: 1.5, sink: 0.28 },
  { id: "c5", lane: -42, z: -166, count: 6, spread: [4.5, 16], mix: MIX.far, scale: [1.0, 1.2], lean: 0.3, yaw: -0.5, jitter: 0.9 },
  { id: "c6", lane: 38, z: -178, count: 4, spread: [4.0, 13], mix: MIX.far, scale: [0.98, 1.16], lean: 0.32, yaw: 0.6, jitter: 0.9 },
  { id: "c7", lane: -25, z: -192, count: 4, spread: [2.6, 10], mix: MIX.mass, scale: [0.92, 1.1], lean: 0.42, yaw: 1.1, jitter: 0.7 },
  { id: "c8", lane: 17.5, z: -208, count: 5, spread: [1.6, 8], mix: MIX.rank, scale: [0.9, 1.06], lean: 0.38, yaw: -0.25, jitter: 0.4 },
  { id: "c9", lane: -7.5, z: -186, count: 3, spread: [1.3, 7], mix: MIX.thicket, scale: [0.86, 1.02], lean: 0.7, yaw: -0.9, jitter: 1.1, sink: 0.2 },
  { id: "c10", lane: 23, z: -156, count: 3, spread: [2.2, 9], mix: MIX.thicket, scale: [0.9, 1.1], lean: 0.45, yaw: 0.45, jitter: 0.7 },

  // --- 4 APPROACH: density on the flanks, centre left open ----------
  // Every cluster here is on the -x side or well short of the monument.
  // The +x side of this stretch is the clearing; see CLEARING_STATIONS.
  { id: "d1", lane: -12, z: -220, count: 3, spread: [1.5, 7], mix: MIX.common, scale: [0.88, 1.02], lean: 0.5, yaw: -0.6, jitter: 0.6 },
  { id: "d2", lane: 13, z: -228, count: 4, spread: [1.8, 9], mix: MIX.common, scale: [0.9, 1.06], lean: 0.4, yaw: 0.3, jitter: 0.5 },
  { id: "d3", lane: -22, z: -246, count: 3, spread: [2.4, 10], mix: MIX.rank, scale: [0.94, 1.12], lean: 0.4, yaw: -0.7, jitter: 0.6 },
  { id: "d4", lane: -40, z: -262, count: 4, spread: [4.0, 14], mix: MIX.far, scale: [1.0, 1.18], lean: 0.3, yaw: 0.2, jitter: 0.9 },
  { id: "d5", lane: -12, z: -272, count: 4, spread: [2.0, 10], mix: MIX.common, scale: [0.9, 1.08], lean: 0.45, yaw: -0.4, jitter: 0.5 },
  { id: "d6", lane: -9.5, z: -292, count: 3, spread: [1.6, 7], mix: MIX.ruined, scale: [0.82, 0.98], lean: 0.9, yaw: 0.8, jitter: 1.4, sink: 0.26 },

  // --- 5 BEYOND: the field continues past where the visitor stops ----
  // e1 is the only group that reads to the RIGHT of the monument in the
  // closing frame — everything nearer than it on that side is inside the
  // monument's own silhouette from the final camera position.
  { id: "e1", at: [72, -344], count: 5, spread: [16, 22], mix: MIX.far, scale: [1.02, 1.2], lean: 0.3, yaw: 0.5, jitter: 1.0 },
  { id: "e2", at: [-28, -338], count: 4, spread: [12, 16], mix: MIX.far, scale: [1.0, 1.18], lean: 0.32, yaw: -0.6, jitter: 0.9 },
  { id: "e3", at: [-8, -372], count: 3, spread: [18, 20], mix: MIX.far, scale: [1.02, 1.2], lean: 0.28, yaw: 0.3, jitter: 1.0 },
  { id: "e4", at: [44, -368], count: 3, spread: [14, 16], mix: MIX.far, scale: [1.0, 1.18], lean: 0.3, yaw: -0.3, jitter: 1.0 },
  // Seen from mid-route as a faint flank far off the left of the path,
  // roughly 130 units out: the "it keeps going" read, before the visitor
  // is anywhere near the monument.
  { id: "e5", at: [-64, -300], count: 3, spread: [14, 18], mix: MIX.far, scale: [1.0, 1.18], lean: 0.3, yaw: 0.8, jitter: 1.0 },
];

// Individually placed markers, exempt from the cluster mixes.
//
// The five GEO_Grave_Hero_A are the field's only dominant bodies and they
// are spaced roughly 80-140 units apart along the walk, one per beat, so
// at most one is ever the largest thing in frame. h4 is the last, sited
// past the monument on the dark side, small in frame and turned away.
const ACCENTS = [
  { id: "h1", type: HERO, at: [-2, -154], rotY: -1.9, scale: 1.02, lean: [0.03, 0.04] },
  { id: "h2", type: HERO, at: [-46, -206], rotY: 1.35, scale: 1.06, lean: [0.02, 0.06] },
  { id: "h3", type: HERO, at: [-22, -262], rotY: 0.55, scale: 1.0, lean: [0.04, -0.05] },
  { id: "h4", type: HERO, at: [-32, -348], rotY: 2.2, scale: 1.12, lean: [0.02, 0.05] },
  { id: "h5", type: HERO, at: [-42.4, -70], rotY: -0.8, scale: 0.96, lean: [0.05, 0.03] },
  // One large shard laid over hard against the route through the middle
  // of the field, where the camera passes closest to it.
  { id: "f1", type: FRAGMENT, at: [-18.5, -136], rotY: 1.75, scale: 0.92, lean: [0.09, 0.14], sink: 0.34 },

  // --- Foreground sweeps ---------------------------------------------
  // Five markers sited deliberately closer to the camera curve than any
  // cluster is allowed to be (~5.0-6.5 units of lateral offset against
  // the clusters' 4.9 minimum) and scaled up to 1.28-1.38, one per beat.
  // These are the parallax layer: the camera passes close enough that
  // each one grows, leaves frame through the side, and briefly frames the
  // cemetery behind it. They are NOT extra population — five cluster
  // slots were given up to pay for them, so the field is still 110.
  //
  // Four of the five sit on the -x flank on purpose. The scene's rake
  // light comes from +x (see GraveyardScene), so a marker on that side
  // turns a lit face toward the route and reads as stone with an edge;
  // the same marker on the other flank would be a black cut-out, which is
  // the exact failure this pass exists to fix. fg3 is the deliberate
  // exception, kept as a pure silhouette for contrast.
  { id: "fg1", type: BLOCK, at: [-37.2, -56], rotY: 0.72, scale: 1.34, lean: [0.06, 0.11], sink: 0.18 },
  { id: "fg2", type: FRAGMENT, at: [-33.6, -118], rotY: -1.15, scale: 1.38, lean: [0.12, 0.09], sink: 0.3 },
  { id: "fg3", type: SLAB_B, at: [-14.4, -150], rotY: 0.34, scale: 1.28, lean: [0.04, -0.08], sink: 0.1 },
  { id: "fg4", type: BLOCK, at: [-21.6, -176], rotY: 1.35, scale: 1.32, lean: [0.07, 0.05], sink: 0.16 },
  { id: "fg5", type: FRAGMENT, at: [-15.0, -214], rotY: -0.62, scale: 1.3, lean: [0.1, 0.13], sink: 0.28 },
];

// --- Placement guards --------------------------------------------------
// Existing scene anchors with an approximate clearance radius, so the
// field breaks around infrastructure and story objects instead of
// clipping through them: TOWERS and FALLEN (GraveyardArchitecture),
// CableBundle / BrokenDisplay / RACKS / FrozenSpinner / SpinnerFragment /
// NotFoundSlab / SlabDrift (GraveyardRelics) and the Graveyard's warm cue
// (GraveyardScene).
//
// Deliberately a local table rather than a reuse of GraveyardMemorials'
// list, which differs in one entry that matters here: it reserves a
// 40-unit radius around the monument, because an anonymous ROW has no
// business near it. This layer does have business near it — framing the
// plinth from outside is half of beat 5 — so the monument is guarded by
// its actual footprint (PLINTH) plus the sightline clearing instead.
const OBSTACLES = [
  { x: -23, z: -12, r: 6 },
  { x: -34, z: -22, r: 6 },
  { x: -46, z: -44, r: 10 },
  { x: -21, z: -30, r: 15 },
  { x: -12, z: -88, r: 8 },
  { x: -11, z: -94, r: 5 },
  { x: -7.4, z: -99, r: 5 },
  { x: -13.6, z: -103, r: 5 },
  { x: -5, z: -106.5, r: 5 },
  { x: -21, z: -122, r: 10 },
  { x: -11.5, z: -116, r: 7 },
  { x: -52, z: -150, r: 11 },
  { x: -4, z: -206, r: 14 },
  { x: 4, z: -188, r: 8 },
  { x: -29, z: -240, r: 8 },
  { x: -31.5, z: -236, r: 8 },
  { x: 62, z: -318, r: 9 },
  { x: -6, z: -332, r: 8 },
  { x: -16, z: -332, r: 9 },
  // The era memorials are 8 units wide and arrived after this field was
  // authored, so they are folded in here rather than hand-copied: the kit
  // breaks around them exactly as it breaks around a tower.
  ...eraMemorials.map((m) => ({ x: m.position[0], z: m.position[1], r: ERA_MEMORIAL_CLEARANCE })),
  // The service stair's excavation and the ruined archive mouth the
  // visitor arrives through. Both are structures with poured concrete
  // footprints, so the field breaks around them exactly as it breaks
  // around a relay tower — and in the stair's case the ground the
  // markers would stand on has literally been removed (see
  // GraveyardArchitecture's Ground). Coordinates come from
  // exitLayout.js so this cannot drift away from what is built.
  EXIT_OBSTACLE,
  ARCHIVE_MOUTH_OBSTACLE,
];

// The monument's two-step plinth (54 x 26, centred on CAPTCHA_X/_Z) plus
// a little margin, as a rectangle rather than a radius so markers can sit
// close along its flanks without standing on it.
const PLINTH = { x0: 1, x1: 59, z0: -335, z1: -305 };

// The camera's own positions at t = 0.70 / 0.80 / 0.90 / 1.00, read off
// GraveyardCamera's curve. See the header: the wedge from each of these
// to the monument's front-face edges is the clearing.
const CLEARING_STATIONS = [
  [-17.0, -175.9],
  [-10.2, -201.8],
  [-2.1, -227.2],
  [8.0, -252.0],
];
const CLEARING_LEFT = [11, -312];
const CLEARING_RIGHT = [49, -312];
const CLEARING_MARGIN = 3.5;
// Past this distance from the station a grave-sized marker covers under a
// tenth of the monument's height, which frames rather than obstructs.
const CLEARING_NEAR = 58;

// GraveyardMemorials' plot slots and burial sections. Mirrored here so
// this layer can stay OUT of the filler field's lanes; two grave layers
// competing for the same offsets produces intersecting stone, not
// density.
const FILLER_PLOT_SLOTS = [9.5, 14.5, 21, 27.5, 35.5];
const FILLER_SECTIONS = [
  [22, -38],
  [-58, -118],
  [-140, -214],
  [-238, -292],
];
const FILLER_LANE_MARGIN = 1.7;

// Wide enough that a marker sweeps the frame edge instead of clipping the
// camera: the closest anything gets to the camera curve is ~4.5 units.
const ROUTE_CLEARANCE = 4.9;
const HERO_GRAVE_CLEARANCE = 4;
const MIN_SEPARATION = 2.6;

function insideClearing(x, z) {
  for (const [sx, sz] of CLEARING_STATIONS) {
    // Only the stretch in front of the station and short of the monument.
    if (z > sz - 5 || z < -308) continue;
    const dz = sz - z;
    if (Math.hypot(x - sx, dz) > CLEARING_NEAR) continue;
    const f = dz / (sz - CLEARING_LEFT[1]);
    const left = sx + (CLEARING_LEFT[0] - sx) * f - CLEARING_MARGIN;
    const right = sx + (CLEARING_RIGHT[0] - sx) * f + CLEARING_MARGIN;
    if (x > left && x < right) return true;
  }
  return false;
}

function onFillerPlotLane(x, z) {
  const offset = Math.abs(x - routeXAt(z));
  if (offset > 38) return false;
  let inSection = false;
  for (const [z0, z1] of FILLER_SECTIONS) if (z <= z0 && z >= z1) inSection = true;
  if (!inSection) return false;
  for (const slot of FILLER_PLOT_SLOTS) {
    if (Math.abs(offset - slot) < FILLER_LANE_MARGIN) return true;
  }
  return false;
}

function blocked(x, z) {
  if (Math.abs(x - routeXAt(z)) < ROUTE_CLEARANCE) return true;
  for (const o of OBSTACLES) {
    const dx = x - o.x;
    const dz = z - o.z;
    if (dx * dx + dz * dz < o.r * o.r) return true;
  }
  if (x > PLINTH.x0 && x < PLINTH.x1 && z < PLINTH.z1 && z > PLINTH.z0) return true;
  if (insideClearing(x, z)) return true;
  if (onFillerPlotLane(x, z)) return true;
  for (const m of heroMemorials) {
    const dx = x - m.position[0];
    const dz = z - m.position[1];
    if (dx * dx + dz * dz < HERO_GRAVE_CLEARANCE * HERO_GRAVE_CLEARANCE) return true;
  }
  return false;
}

// Expands the authored clusters exactly once. Rejection sampling with a
// fixed attempt budget: a cluster that cannot fit its full count in the
// space the guards leave it simply ends up one marker short, which is
// invisible, whereas relaxing a guard would not be.
function buildMarkerField() {
  const rand = mulberry32(517731);
  const markers = [];

  const clearOfNeighbours = (x, z) => {
    for (const m of markers) {
      const dx = m.x - x;
      const dz = m.z - z;
      if (dx * dx + dz * dz < MIN_SEPARATION * MIN_SEPARATION) return false;
    }
    return true;
  };

  for (const a of ACCENTS) {
    markers.push({
      type: a.type,
      x: a.at[0],
      z: a.at[1],
      rotY: a.rotY,
      scale: a.scale,
      leanX: a.lean[0],
      leanZ: a.lean[1],
      sink: a.sink ?? DEFAULT_SINK,
    });
  }

  for (const c of CLUSTERS) {
    let placed = 0;
    for (let attempt = 0; attempt < c.count * 14 && placed < c.count; attempt++) {
      const u = rand() * 2 - 1;
      const v = rand() * 2 - 1;
      let x;
      let z;
      if (c.at) {
        x = c.at[0] + u * c.spread[0];
        z = c.at[1] + v * c.spread[1];
      } else {
        z = c.z + v * c.spread[1];
        x = routeXAt(z) + c.lane + u * c.spread[0];
      }
      if (blocked(x, z)) continue;
      if (!clearOfNeighbours(x, z)) continue;

      const lean = c.lean * 0.16;
      markers.push({
        type: c.mix[Math.floor(rand() * c.mix.length)],
        x,
        z,
        rotY: c.yaw + (rand() - 0.5) * 2 * c.jitter,
        scale: c.scale[0] + rand() * (c.scale[1] - c.scale[0]),
        leanX: (rand() - 0.5) * 2 * lean,
        leanZ: (rand() - 0.5) * 2 * lean,
        sink: (c.sink ?? DEFAULT_SINK) + rand() * 0.1,
      });
      placed++;
    }
  }

  return markers;
}

// Built at module load, not per mount: the field is pure data and a
// remount of the Graveyard should not recompute it.
//
// The per-instance tint runs on its OWN PRNG rather than drawing from the
// layout's, deliberately: the composition above was solved and verified
// against the camera, and a new random call inside that loop would have
// shifted every marker in the field. Same reason GraveyardMemorials keeps
// its own second seed for archetype selection.
const FIELD_INSTANCES = (() => {
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const tintRand = mulberry32(20873);
  const byType = new Map();

  for (const m of buildMarkerField()) {
    dummy.position.set(m.x, groundHeightAt(m.x, m.z) - m.sink, m.z);
    dummy.rotation.set(m.leanX, m.rotY, m.leanZ);
    const s = KIT_BASE_SCALE * m.scale;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();

    const offset = Math.abs(m.x - routeXAt(m.z));
    let value = TINT_MIN + tintRand() * TINT_RANGE;
    if (offset < 10) value *= TINT_NEAR_LANE;
    else if (offset > 38 || m.z < -300) value *= TINT_DEEP_FIELD;
    // setScalar writes the working (linear) space directly, so this stays
    // a pure multiplier on the material's albedo with no second colour
    // conversion applied to it.
    tint.setScalar(value);

    let list = byType.get(m.type);
    if (!list) byType.set(m.type, (list = { matrices: [], colors: [] }));
    list.matrices.push(dummy.matrix.clone());
    list.colors.push(tint.clone());
  }

  return [...byType];
})();

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
        const fracture = source.name === "MAT_Fracture";
        cloned.color = new THREE.Color(fracture ? STONE_FRACTURE : STONE_BODY);
        // Only the break faces are taken off full matte; the weathered
        // body keeps the roughness the kit was authored with.
        if (fracture) cloned.roughness = FRACTURE_ROUGHNESS;
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

// One draw call: every marker of one kit mesh, for one of that mesh's
// primitives. See the header for why frustum culling is off.
function MarkerInstances({ piece, matrices, colors }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i]);
      mesh.setColorAt(i, colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, colors]);

  return (
    <instancedMesh
      ref={ref}
      args={[piece.geometry, piece.material, matrices.length]}
      frustumCulled={false}
    />
  );
}

function GraveMarkerFieldContent() {
  const parts = useKitParts();

  return (
    <group>
      {FIELD_INSTANCES.map(([type, { matrices, colors }]) =>
        (parts[type] ?? []).map((piece, i) => (
          <MarkerInstances
            key={`${type}-${i}`}
            piece={piece}
            matrices={matrices}
            colors={colors}
          />
        )),
      )}
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
