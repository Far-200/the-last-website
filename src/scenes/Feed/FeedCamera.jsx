// src/scenes/Feed/FeedCamera.jsx
//
// The Feed's continuous camera authority. Position and orientation are
// derived every frame from a single normalized progress value (owned by
// Feed.jsx, driven by wheel input) — this is the only system that moves
// the Feed camera continuously. GSAP never touches it; GSAP is reserved
// for discrete local moments elsewhere (see FeedFragment's reconstruction
// sequence). Damping happens once, at the progress level, so both
// position and look direction come out smooth together instead of
// needing separate easing.
//
// Look direction
// --------------
// The previous pass aimed the camera along the path tangent. With
// waypoints that drift laterally, the tangent swings, so the whole nave
// yawed back and forth as the visitor scrolled and the vanishing point
// never settled — which reads as "floating", not "walking down a hall".
//
// The camera now looks at a point far ahead down the nave, at eye level,
// nudged only slightly by its own lateral offset. The horizon stays
// level, the vanishing point stays near frame centre, and the aperture at
// the end of the nave stays roughly where the visitor expects it, while
// the drift in the waypoints still produces a gentle turn as the columns
// sweep past.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EYE_HEIGHT, ROUTE_START_Z, ROUTE_END_Z } from "./FeedArchitecture";

// Authored waypoints down the nave. Lateral drift is kept small
// (roughly +-1.8 in a 17-unit-wide nave) — enough that the camera passes
// nearer one colonnade than the other and the foreground slabs crop the
// frame, not so much that it swerves.
const WAYPOINTS = [
  [0, EYE_HEIGHT, ROUTE_START_Z],
  [-1.2, EYE_HEIGHT - 0.05, -6],
  [1.4, EYE_HEIGHT + 0.1, -26],
  [-1.8, EYE_HEIGHT - 0.1, -48],
  [0.9, EYE_HEIGHT + 0.15, -68],
  [-1.1, EYE_HEIGHT - 0.05, -92],
  [0.2, EYE_HEIGHT + 0.05, ROUTE_END_Z],
];

// How far down the nave the gaze is fixed, and how much of the camera's
// own lateral offset it inherits. A low blend keeps the turn gentle.
const LOOK_DISTANCE = 40;
const LOOK_LATERAL_BLEND = 0.3;
// A slight upward tilt (about 2 degrees). Aimed level, the near floor took
// close to half the frame while the vault was cropped away, which reads as
// looking at the ground rather than standing inside something tall.
const LOOK_RISE = 1.4;

export default function FeedCamera({ progressRef, reduceMotion = false }) {
  const dampedProgress = useRef(0);
  const tmpPosition = useRef(new THREE.Vector3());
  const tmpLookAt = useRef(new THREE.Vector3());

  const path = useMemo(
    () => new THREE.CatmullRomCurve3(WAYPOINTS.map((p) => new THREE.Vector3(...p))),
    [],
  );

  useFrame(({ camera }, delta) => {
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.002, delta);
    dampedProgress.current += (progressRef.current - dampedProgress.current) * amount;

    const t = THREE.MathUtils.clamp(dampedProgress.current, 0, 1);

    path.getPointAt(t, tmpPosition.current);
    camera.position.copy(tmpPosition.current);

    tmpLookAt.current.set(
      tmpPosition.current.x * LOOK_LATERAL_BLEND,
      tmpPosition.current.y + LOOK_RISE,
      tmpPosition.current.z - LOOK_DISTANCE,
    );
    camera.lookAt(tmpLookAt.current);
  });

  return null;
}
