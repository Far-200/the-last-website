// src/scenes/Feed/FeedCamera.jsx
//
// The Feed's continuous camera authority. Position and orientation are
// derived every frame from a single normalized progress value (owned by
// Feed.jsx, driven by wheel input) — this is the only system that moves
// the Feed camera continuously. GSAP never touches the camera directly;
// GSAP is reserved for discrete local moments elsewhere (see
// FeedFragment's reconstruction sequence) and, during arrival, for easing
// the plain arrivalProgressRef this component reads (see below) — the
// same "GSAP drives a ref, useFrame reads it" split PreludeScene's
// LeavingDolly uses for the matching half of this same handoff. Damping
// happens once, at the progress level, so both position and look
// direction come out smooth together instead of needing separate easing.
//
// Arrival and departure
// -------
// Feed mounts a few units further back on its own route than its normal
// t=0 rest position, with progress genuinely held at 0 (Feed.jsx does not
// touch progressRef until arrival completes) — see Feed.jsx's own header
// note. While `arrival` is true this component ignores progressRef
// entirely and eases camera position from ARRIVAL_START toward
// WAYPOINTS[0] using arrivalProgressRef instead, continuing the forward
// motion Prelude's own leaving-phase dolly started rather than snapping
// straight to the route's start. ARRIVAL_END is exactly WAYPOINTS[0], so
// when arrival flips off and normal progress-driven control resumes
// (dampedProgress is still 0 at that point), there is no position
// discontinuity — arrival simply stops writing and progress-driven control
// picks up from the exact frame it left off on. Departure uses the inverse
// discipline: on its first frame it captures the camera pose actually
// rendered by normal damping, then continues that captured horizontal gaze
// briefly into the fog. It never snaps to the authored final waypoint.
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

// How far behind the route's own start the arrival dolly begins — see
// the header note. Kept modest: this is a continuation of Prelude's own
// dolly, not a second journey, and it shares FeedArchitecture's own
// world scale (the first columns stand at z=2, only 10 units ahead of
// ROUTE_START_Z), so a large arrival distance would place the camera
// somewhere the architecture was never authored to be seen from.
export const ARRIVAL_DISTANCE = 6;
const ARRIVAL_START = new THREE.Vector3(0, EYE_HEIGHT, ROUTE_START_Z + ARRIVAL_DISTANCE);
const ARRIVAL_END = new THREE.Vector3(...WAYPOINTS[0]);
const LEAVING_DISTANCE = 12;

export default function FeedCamera({
  progressRef,
  reduceMotion = false,
  arrival = false,
  arrivalProgressRef,
  leaving = false,
  leavingProgressRef,
}) {
  const dampedProgress = useRef(0);
  const tmpPosition = useRef(new THREE.Vector3());
  const tmpLookAt = useRef(new THREE.Vector3());
  const leavingStarted = useRef(false);
  const leavingStart = useRef(new THREE.Vector3());
  const leavingEnd = useRef(new THREE.Vector3());
  const leavingDirection = useRef(new THREE.Vector3());
  const leavingHorizontal = useRef(new THREE.Vector3());

  const path = useMemo(
    () => new THREE.CatmullRomCurve3(WAYPOINTS.map((p) => new THREE.Vector3(...p))),
    [],
  );

  useFrame(({ camera }, delta) => {
    if (leaving) {
      if (!leavingStarted.current) {
        leavingStarted.current = true;
        leavingStart.current.copy(camera.position);
        camera.getWorldDirection(leavingDirection.current);
        leavingHorizontal.current.copy(leavingDirection.current);
        leavingHorizontal.current.y = 0;
        leavingHorizontal.current.normalize();
        leavingEnd.current
          .copy(leavingStart.current)
          .addScaledVector(leavingHorizontal.current, LEAVING_DISTANCE);
      }

      const raw = THREE.MathUtils.clamp(leavingProgressRef?.current ?? 1, 0, 1);
      const eased = 1 - (1 - raw) * (1 - raw);
      if (!reduceMotion) {
        tmpPosition.current.lerpVectors(leavingStart.current, leavingEnd.current, eased);
        camera.position.copy(tmpPosition.current);
      }
      tmpLookAt.current.copy(camera.position).addScaledVector(leavingDirection.current, LOOK_DISTANCE);
      camera.lookAt(tmpLookAt.current);
      return;
    }

    leavingStarted.current = false;

    if (arrival) {
      // Progress-driven damping never starts while arriving — dampedProgress
      // stays exactly 0, so the instant arrival ends, normal control resumes
      // from precisely WAYPOINTS[0] with nothing to catch up on.
      //
      // arrivalProgressRef itself is a linear 0-1 ramp (see Feed.jsx) —
      // the ease-out deceleration lives here, as an explicit remap, so it
      // can be tuned independently of Atmosphere's own (much more
      // backloaded) remap of the same raw value. Quadratic ease-out: fast
      // initial coasting, settling gently into WAYPOINTS[0].
      const raw = THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1);
      const eased = 1 - (1 - raw) * (1 - raw);
      tmpPosition.current.lerpVectors(ARRIVAL_START, ARRIVAL_END, eased);
    } else {
      const amount = reduceMotion ? 1 : 1 - Math.pow(0.002, delta);
      dampedProgress.current += (progressRef.current - dampedProgress.current) * amount;

      const t = THREE.MathUtils.clamp(dampedProgress.current, 0, 1);
      path.getPointAt(t, tmpPosition.current);
    }

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
