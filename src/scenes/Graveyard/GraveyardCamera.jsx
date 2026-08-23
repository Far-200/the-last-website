// src/scenes/Graveyard/GraveyardCamera.jsx
//
// The Graveyard's continuous camera authority — same single-source-of-
// truth pattern as FeedCamera (progress owned by Graveyard.jsx, driven
// by wheel input, GSAP never touches it), but heavier and calmer: the
// damping constant is smaller so the camera takes longer to catch up to
// the visitor's own scroll.
//
// Why the previous aiming model had to go
// ---------------------------------------
// It set the look-at to `(camera.x * 0.15, ..., CAPTCHA_Z)`. Camera x
// stayed inside +-1.1 across the whole route and the monument sat at
// x = 0, so the look-at point was the monument, essentially exactly, from
// t = 0 to t = 1. The camera's optical axis passed through the CAPTCHA
// for the entire scene. Combined with a route that ran dead straight down
// the same axis, that is the precise grammar of an objective marker:
// see landmark, walk at landmark, arrive. It made the Graveyard read as
// an opening area with a destination rather than as an aftermath.
//
// The camera now looks along its OWN HEADING and only converges onto the
// monument late:
//
//   * The route bends. It starts well off to one side and angled away,
//     drifts, and only turns toward the monument in its last third. The
//     monument is therefore off-axis and peripheral early, not centred.
//   * The look target is a blend between a point down the path tangent
//     (where the visitor is actually walking) and the monument. The blend
//     is zero until CONVERGE_START, so for the first stretch the camera
//     is simply looking where it is going and the monument is wherever it
//     happens to fall — which is the difference between discovering
//     something and being pointed at it.
//   * Convergence stops short of the monument's centre by FINAL_OFFSET_X,
//     so the closing composition is slightly off-axis instead of a
//     centred altar shot.
//
// Everything here remains a continuous function of progress, so camera
// authority stays entirely with the progression system; no GSAP touches
// it.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EYE_HEIGHT, CAPTCHA_X, CAPTCHA_Z } from "./GraveyardArchitecture";

// Kept roughly in step with groundHeight.js's ROUTE, which damps terrain
// beneath the camera. These are the authority; that one approximates it.
const WAYPOINTS = [
  [-28, EYE_HEIGHT, 10],
  [-32, EYE_HEIGHT + 0.12, -64],
  [-24, EYE_HEIGHT + 0.06, -142],
  [-6, EYE_HEIGHT, -216],
  // Stops 71 units short of the monument and 22 units to its left. Both
  // gaps are framing: the distance keeps the whole 58-unit monument
  // inside a 25-degree half-angle with headroom, and the lateral offset
  // means the visitor never arrives square in front of it.
  [8, EYE_HEIGHT, -252],
];

// How far down its own heading the camera looks before convergence.
const TANGENT_DISTANCE = 90;

// Convergence onto the monument. Held at zero through the opening so the
// visitor is looking at the aftermath around them, then eased in.
const CONVERGE_START = 0.3;
const CONVERGE_END = 0.9;

// The closing frame is aimed this far to one side of the monument's
// centre, so it sits off-axis rather than dead centre. Small — this is
// quiet asymmetry, not a dutch angle.
const FINAL_OFFSET_X = 9;

const LOOK_RISE_FAR = 3.5;
const LOOK_RISE_NEAR = 20;
const RISE_RAMP_START = 0.34;
// A little over a quarter metre of settle across the route. Enough to
// feel, not enough to read as a camera move.
const EYE_DROP = 0.3;

export default function GraveyardCamera({ progressRef, reduceMotion = false }) {
  const dampedProgress = useRef(0);
  const tmpPosition = useRef(new THREE.Vector3());
  const tmpTangent = useRef(new THREE.Vector3());
  const tmpLookAt = useRef(new THREE.Vector3());
  const tmpAhead = useRef(new THREE.Vector3());

  const path = useMemo(
    () => new THREE.CatmullRomCurve3(WAYPOINTS.map((p) => new THREE.Vector3(...p))),
    [],
  );

  useFrame(({ camera }, delta) => {
    // A slower catch-up than Feed's (0.002): the Graveyard should feel
    // heavier, less responsive to the visitor's own scroll speed.
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.0006, delta);
    dampedProgress.current += (progressRef.current - dampedProgress.current) * amount;

    const t = THREE.MathUtils.clamp(dampedProgress.current, 0, 1);

    path.getPointAt(t, tmpPosition.current);
    const framing = THREE.MathUtils.smoothstep(t, RISE_RAMP_START, 1);
    camera.position.set(
      tmpPosition.current.x,
      tmpPosition.current.y - EYE_DROP * framing,
      tmpPosition.current.z,
    );

    // Where the visitor is walking: a point down the path's own tangent.
    path.getTangentAt(t, tmpTangent.current);
    tmpAhead.current
      .copy(camera.position)
      .addScaledVector(tmpTangent.current, TANGENT_DISTANCE);

    // Where the machine is, offset so the closing frame is not centred.
    const converge = THREE.MathUtils.smoothstep(t, CONVERGE_START, CONVERGE_END);
    tmpLookAt.current.set(
      THREE.MathUtils.lerp(tmpAhead.current.x, CAPTCHA_X - FINAL_OFFSET_X, converge),
      0,
      THREE.MathUtils.lerp(tmpAhead.current.z, CAPTCHA_Z, converge),
    );

    tmpLookAt.current.y =
      camera.position.y + THREE.MathUtils.lerp(LOOK_RISE_FAR, LOOK_RISE_NEAR, framing);

    camera.lookAt(tmpLookAt.current);
  });

  return null;
}
