// src/scenes/Graveyard/groundHeight.js
//
// The Graveyard's terrain height field and the approximate route
// centreline, extracted so the mesh that renders the ground
// (GraveyardArchitecture), everything that has to stand on it
// (GraveyardRelics, the towers) and the camera all read from one
// definition and cannot drift apart. Same reason Feed keeps
// useDepthFade.js separate from its two callers.
//
// What matters in the height field is SLOPE, not amplitude
// --------------------------------------------------------
// A grazing light reveals relief through N·L, which depends on the
// surface normal — so what the light can see is amplitude times
// wavenumber, not amplitude alone. An early attempt used long
// wavelengths (the shortest ~88 units at 0.13 amplitude), giving a
// maximum slope of 0.009 — half a degree. Against a key at ~2 degrees
// elevation that is no variation at all, and the ground measured
// RGB(0,0,0) however it was tuned. The finest term below is ~30 units
// at 0.4 amplitude, so normals tilt by up to ~6 degrees, which against
// a ~9-degree key swings N·L across a fivefold range. That is what
// makes ground read as ground, and it is why
// GraveyardArchitecture tessellates at ~6 units per segment — coarser
// would undersample the only term doing the work.

import * as THREE from "three";

// The route's centreline as x over z, matching GraveyardCamera's
// WAYPOINTS closely enough to damp terrain beneath the camera. It is a
// bending path, not a straight axis: see GraveyardCamera for why the
// straight version had to go.
//
// Stored as [z, x] pairs ordered from the route's start (z positive)
// toward its end (z negative).
const ROUTE = [
  [10, -28],
  [-64, -32],
  [-142, -24],
  [-216, -6],
  [-252, 8],
];

export function routeXAt(z) {
  if (z >= ROUTE[0][0]) return ROUTE[0][1];
  const last = ROUTE[ROUTE.length - 1];
  if (z <= last[0]) return last[1];
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const [z0, x0] = ROUTE[i];
    const [z1, x1] = ROUTE[i + 1];
    if (z <= z0 && z >= z1) {
      return THREE.MathUtils.lerp(x0, x1, (z0 - z) / (z0 - z1));
    }
  }
  return last[1];
}

export function groundHeightAt(x, z) {
  const broad = Math.sin(x * 0.0109) * Math.cos(z * 0.0093) * 0.45;
  const mid = Math.sin(x * 0.052 + 1.7) * Math.cos(z * 0.047 + 0.4) * 0.38;
  const fine = Math.sin(x * 0.207 + 3.1) * Math.cos(z * 0.191 + 2.2) * 0.4;

  // Damped along the route the camera actually travels, so the terrain
  // never rises far enough under a fixed-height camera to look like it
  // is wading. Deliberately a gentle damp (0.55, not the 0.25 an earlier
  // version used) and keyed to the *bending* route rather than to x = 0:
  // a strongly flattened strip along a straight axis renders, under a
  // grazing light, as a smooth band through rough terrain — which is a
  // visible path, exactly the "runway to the objective" read this pass
  // exists to remove.
  const offRoute = Math.abs(x - routeXAt(z));
  const damp = 0.55 + 0.45 * THREE.MathUtils.smoothstep(offRoute, 9, 34);
  return (broad + mid + fine) * damp;
}
