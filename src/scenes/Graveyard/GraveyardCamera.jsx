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
// Everything here remains a continuous function of refs; GSAP only
// advances the plain arrival progress in Graveyard.jsx. This useFrame
// remains the sole camera writer for arrival, route progression AND the
// exit -- see below.
//
// The exit
// --------
// When the CAPTCHA has failed and the service door beside the monument
// has opened (see GraveyardExit.jsx), Graveyard.jsx tweens ONE plain
// number - exitProgressRef, 0 to 1, linear - and this component turns it
// into an authored shot. GSAP never touches camera.position or the
// camera's orientation here any more than it does anywhere else in the
// project.
//
// On the first exit frame the camera's ACTUAL rendered pose is captured:
// its position, and the look target normal control was writing on the
// previous frame (kept in lastLookAt for exactly this reason). Damping
// means the camera is not necessarily at the authored t = 1 waypoint, so
// interpolating from the waypoint instead of from the truth would snap.
//
// The route is explicit piecewise interpolation rather than a spline,
// because the shot is three distinct actions with different easings and a
// CatmullRom through them would round off precisely the corners that
// carry the meaning:
//
//   0.00 - 0.16  NOTICE.   Position held. The look target alone turns
//                          from the failed interface - 16 degrees up and
//                          to the right - onto the doorway, 27 degrees
//                          left and 14 degrees down. The camera has been
//                          staring at a dead machine; something opened
//                          beside it; we look.
//   0.16 - 0.60  APPROACH. Position eases from rest to rest across the
//                          13.5 units to a stop just outside the door,
//                          look target pinned to the doorway so it grows
//                          in a fixed part of the frame instead of
//                          swimming. Ending at a standstill is the beat:
//                          you stand at a threshold before going through.
//   0.60 - 1.00  ENTER AND DESCEND. One arc-length chain through the
//                          threshold and down the flight, eased IN from
//                          that standstill so it still carries speed at
//                          the handoff rather than parking. The look
//                          target stops being a point and becomes a
//                          pitch, ramping to 26 degrees below horizontal
//                          - a descent, not a dive.
//
// Reduced motion keeps the notice turn and drops the travel entirely (see
// the branch below): the door still opens, the seam still appears, the
// stairwell is still lit and the atmosphere still goes underground, but
// the camera does not walk. The story survives; the vestibular load does
// not.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EYE_HEIGHT, CAPTCHA_X, CAPTCHA_Z } from "./GraveyardArchitecture";
import {
  EXIT_APPROACH_POSE,
  EXIT_THRESHOLD_POSE,
  EXIT_DESCENT_POSE,
  EXIT_DOOR_LOOK,
  EXIT_TURN_END,
  EXIT_WALK_END,
} from "./exitLayout";

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
const ARRIVAL_DISTANCE = 14;

// Where the aim stops being a fixed world point and starts being a
// heading. Up to here the look target is the doorway itself, so the door
// grows in a fixed part of the frame during the approach instead of
// swimming. After it, aiming at ANY fixed point fails: the camera is
// travelling down a 32-degree flight, so a target that does not descend
// with it flattens out to a near-horizontal gaze within a couple of
// units — measured off the render, at 85 per cent through the exit the
// camera was 65 per cent down the flight and looking 4.8 degrees below
// horizontal, which shows the far wall and none of the stair.
//
// So the descent aims along a PITCH instead, applied to the camera's own
// position: 26 degrees down by the end, which puts the treads across the
// lower half of the frame and the soffit across the top. The ramp starts
// at +1.3 degrees, which is exactly what the fixed door target was
// producing at the moment the handover happens, so there is no kink.
const EXIT_LOOK_STAIR_START = 0.62;
const EXIT_LOOK_STAIR_END = 0.88;
const EXIT_PITCH_START = 0.023;
const EXIT_PITCH_END = -0.46;
const EXIT_LOOK_AHEAD = 8;

export default function GraveyardCamera({
  progressRef,
  reduceMotion = false,
  arrival = false,
  arrivalProgressRef,
  exit = false,
  exitProgressRef,
}) {
  const dampedProgress = useRef(0);
  const tmpPosition = useRef(new THREE.Vector3());
  const tmpTangent = useRef(new THREE.Vector3());
  const tmpLookAt = useRef(new THREE.Vector3());
  const tmpAhead = useRef(new THREE.Vector3());
  const arrivalStart = useRef(new THREE.Vector3());
  const normalStart = useRef(new THREE.Vector3());
  // The look target normal control wrote last frame. Captured rather than
  // recomputed so the exit begins from what the visitor is actually
  // looking at, damping lag included.
  const lastLookAt = useRef(new THREE.Vector3(CAPTCHA_X - FINAL_OFFSET_X, 20, CAPTCHA_Z));
  const exitStarted = useRef(false);
  const exitStartPos = useRef(new THREE.Vector3());
  const exitStartLook = useRef(new THREE.Vector3());

  const path = useMemo(
    () => new THREE.CatmullRomCurve3(WAYPOINTS.map((p) => new THREE.Vector3(...p))),
    [],
  );

  // The exit route, built once. The enter-and-descend leg is spent by ARC
  // LENGTH rather than per-segment, so the camera does not change pace at
  // the threshold just because the two segments have different lengths.
  const exitRoute = useMemo(() => {
    const approach = new THREE.Vector3(...EXIT_APPROACH_POSE);
    const threshold = new THREE.Vector3(...EXIT_THRESHOLD_POSE);
    const descent = new THREE.Vector3(...EXIT_DESCENT_POSE);
    const legA = approach.distanceTo(threshold);
    const legB = threshold.distanceTo(descent);
    return {
      approach,
      threshold,
      descent,
      legA,
      legB,
      total: legA + legB,
      doorLook: new THREE.Vector3(...EXIT_DOOR_LOOK),
    };
  }, []);

  useFrame(({ camera }, delta) => {
    if (exit) {
      if (!exitStarted.current) {
        exitStarted.current = true;
        exitStartPos.current.copy(camera.position);
        exitStartLook.current.copy(lastLookAt.current);
      }

      const e = THREE.MathUtils.clamp(exitProgressRef?.current ?? 0, 0, 1);

      // --- position ---------------------------------------------------
      if (reduceMotion || e <= EXIT_TURN_END) {
        camera.position.copy(exitStartPos.current);
      } else if (e <= EXIT_WALK_END) {
        const t = (e - EXIT_TURN_END) / (EXIT_WALK_END - EXIT_TURN_END);
        tmpPosition.current.lerpVectors(
          exitStartPos.current,
          exitRoute.approach,
          t * t * (3 - 2 * t),
        );
        camera.position.copy(tmpPosition.current);
      } else {
        const t = (e - EXIT_WALK_END) / (1 - EXIT_WALK_END);
        const travelled = Math.pow(t, 1.5) * exitRoute.total;
        if (travelled <= exitRoute.legA) {
          tmpPosition.current.lerpVectors(
            exitRoute.approach,
            exitRoute.threshold,
            exitRoute.legA > 0 ? travelled / exitRoute.legA : 1,
          );
        } else {
          tmpPosition.current.lerpVectors(
            exitRoute.threshold,
            exitRoute.descent,
            exitRoute.legB > 0 ? (travelled - exitRoute.legA) / exitRoute.legB : 1,
          );
        }
        camera.position.copy(tmpPosition.current);
      }

      // --- orientation ------------------------------------------------
      if (e <= EXIT_TURN_END) {
        const t = EXIT_TURN_END > 0 ? e / EXIT_TURN_END : 1;
        tmpLookAt.current.lerpVectors(
          exitStartLook.current,
          exitRoute.doorLook,
          t * t * (3 - 2 * t),
        );
      } else if (e <= EXIT_LOOK_STAIR_START) {
        tmpLookAt.current.copy(exitRoute.doorLook);
      } else {
        // Heading, not a point — see the note on EXIT_LOOK_STAIR_START.
        const pitch = THREE.MathUtils.lerp(
          EXIT_PITCH_START,
          EXIT_PITCH_END,
          THREE.MathUtils.smoothstep(e, EXIT_LOOK_STAIR_START, EXIT_LOOK_STAIR_END),
        );
        tmpLookAt.current.set(
          camera.position.x,
          camera.position.y + Math.sin(pitch) * EXIT_LOOK_AHEAD,
          camera.position.z - Math.cos(pitch) * EXIT_LOOK_AHEAD,
        );
      }
      camera.lookAt(tmpLookAt.current);
      return;
    }

    path.getPointAt(0, normalStart.current);
    path.getTangentAt(0, tmpTangent.current);

    if (arrival) {
      // Start behind the real first waypoint on its actual tangent, not
      // from an unrelated invented pose. At completion every camera value
      // below exactly matches normal t=0 control.
      arrivalStart.current
        .copy(normalStart.current)
        .addScaledVector(tmpTangent.current, -ARRIVAL_DISTANCE);
      const raw = THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1);
      const eased = 1 - (1 - raw) * (1 - raw);
      const arrivalT = reduceMotion ? 1 : eased;
      tmpPosition.current.lerpVectors(arrivalStart.current, normalStart.current, arrivalT);
      camera.position.copy(tmpPosition.current);
      tmpAhead.current.copy(camera.position).addScaledVector(tmpTangent.current, TANGENT_DISTANCE);
      tmpLookAt.current.set(tmpAhead.current.x, camera.position.y + LOOK_RISE_FAR, tmpAhead.current.z);
      camera.lookAt(tmpLookAt.current);
      lastLookAt.current.copy(tmpLookAt.current);

      if (camera.isPerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(52, 50, arrivalT);
        camera.updateProjectionMatrix();
      }
      return;
    }

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
    lastLookAt.current.copy(tmpLookAt.current);
  });

  return null;
}
