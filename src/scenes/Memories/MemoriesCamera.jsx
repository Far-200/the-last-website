// src/scenes/Memories/MemoriesCamera.jsx
//
// Memories' continuous camera authority. Same single-source-of-truth
// contract as Feed's and the Graveyard's — progress is owned by
// Memories.jsx, driven by wheel input, and GSAP never touches the camera
// — but deliberately NOT the same implementation, because the sensation
// has to be different rather than the coordinates.
//
// What is structurally different from GraveyardCamera
// ---------------------------------------------------
//  * Still no spline. This grew from one segment to three when a second
//    and third fragment were added, but each segment is still a plain
//    eased lerp between two authored points — the whole route is under
//    9 units end to end, and a CatmullRom curve buys nothing at that
//    scale that a piecewise-linear chain doesn't already give for free.
//    "Honest about the scale" from the original version of this file
//    still holds; it just now has three short honest segments instead
//    of one.
//  * No tangent-following. There is nothing to walk toward here; the
//    camera is always looking at whichever fragment is next. Attention
//    moves lamp -> fragment one -> fragment two -> fragment three, each
//    hand-off a look-target lerp rather than a followed heading.
//  * EVERY STOP ENDS LOOKING DOWN. This is the important one, carried
//    over unchanged from the single-fragment version: the Graveyard
//    ramped its aim upward to tower a monument over the visitor; every
//    stop here tilts the camera down onto something small near the
//    floor. Looking up at a machine and looking down at a person's thing
//    are the two halves of the same emotional move, and repeating it
//    for all three fragments is deliberate, not an oversight — every
//    memory here is something you have to look down to find.
//  * Travel per scroll stays roughly eighteen times slower per unit than
//    the Graveyard's, so the whole approach reads as observational
//    rather than as covering ground.
//
// Arrival
// -------
// The scene no longer begins at KEYFRAMES[0]. It begins part-way down the
// last flight of the stair the visitor was already descending when the
// Graveyard handed over (see MemoriesArrival.jsx and layout.js), and eases
// the remaining six and a half units into KEYFRAMES[0] exactly.
//
// Two things make that a continuation rather than a second entrance:
//
//   * The easing is ease-OUT, not ease-in-out. The Graveyard's own exit
//     is still travelling at the moment it hands over — its final segment
//     eases in and never parks — so this side has to start at speed and
//     settle, not start from rest. Starting from rest is what would read
//     as "the descent stopped and then a new shot began".
//   * The end state is not "close to" KEYFRAMES[0]; it IS KEYFRAMES[0],
//     position and look target both, and progress is genuinely held at 0
//     underneath (Memories.jsx discards input during arrival). So when
//     arrival stops writing, normal control resumes on the identical
//     frame. Zero snap by construction, the same discipline FeedCamera's
//     own arrival uses.
//
// Reduced motion collapses arrival to its end pose immediately, matching
// GraveyardCamera's own reduced-motion arrival branch.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  LAMP_POSITION,
  MEMORY_POSITION,
  VOICEMAIL_POSITION,
  PHOTO_POSITION,
  STOPS,
  ARRIVAL_POSE,
  ARRIVAL_LOOK,
} from "./layout";

export const EYE_HEIGHT = 1.62;

const KEYFRAMES = [
  {
    pos: [0.9, EYE_HEIGHT, 5.1],
    look: [LAMP_POSITION[0] + 0.5, LAMP_POSITION[1] - 0.1, LAMP_POSITION[2]],
  },
  {
    // Unchanged from the single-fragment version: close enough to read
    // handwriting-scale text, dark held around the pool.
    pos: [-0.28, 1.58, 2.05],
    look: MEMORY_POSITION,
  },
  {
    pos: [-1.55, 1.35, -1.55],
    look: VOICEMAIL_POSITION,
  },
  {
    // The closest and lowest of the four — the final approach, and the
    // frame extinction plays out in front of.
    pos: [0.15, 1.05, -2.9],
    look: PHOTO_POSITION,
  },
];

function ease(t) {
  return t * t * (3 - 2 * t);
}

// Arrival shaping. The easing exponent is the compromise between two
// things that pull against each other: a higher number matches the speed
// the Graveyard's exit is still carrying when it hands over, and a lower
// number keeps the camera on the stair for longer instead of spending
// most of the arrival already standing in the room. 1.45 lands at about
// 3.3 units per second off the mark, against the Graveyard's 4.6, which
// is inside what a 0.45-second overlay can absorb.
const ARRIVAL_EASE = 1.45;
const ARRIVAL_PITCH_START = -0.46; // 26 degrees down: the handover aim
const ARRIVAL_PITCH_END = -0.1;
const ARRIVAL_LOOK_AHEAD = 7;

export default function MemoriesCamera({
  progressRef,
  reduceMotion = false,
  arrival = false,
  arrivalProgressRef,
}) {
  const damped = useRef(0);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const heading = useRef(new THREE.Vector3());

  const vecs = useMemo(
    () => KEYFRAMES.map((k) => ({ pos: new THREE.Vector3(...k.pos), look: new THREE.Vector3(...k.look) })),
    [],
  );

  const entry = useMemo(
    () => ({
      pos: new THREE.Vector3(...ARRIVAL_POSE),
      look: new THREE.Vector3(...ARRIVAL_LOOK),
    }),
    [],
  );

  useFrame(({ camera }, delta) => {
    if (arrival) {
      const raw = THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1);
      // Ease-out, but gentler than a square. A square covered half the
      // remaining flight in the first third of the duration, which spent
      // most of the arrival already standing in the room; 1.7 keeps the
      // camera on the stair long enough for the stair to be what the
      // visitor is looking at.
      const t = reduceMotion ? 1 : 1 - Math.pow(1 - raw, ARRIVAL_EASE);
      pos.current.lerpVectors(entry.pos, vecs[0].pos, t);
      camera.position.copy(pos.current);

      // AIM BY HEADING FIRST, BY TARGET SECOND.
      //
      // Lerping straight from a fixed entry point to the lamp does not
      // work, and the reason is geometric rather than aesthetic: the
      // flight descends at 33 degrees, so an aim that starts anywhere
      // near horizontal puts every tread below the bottom of the frame.
      // Measured off the render, a plain point-to-point lerp was looking
      // 16 degrees down while travelling 33 degrees down, and the
      // incoming frame contained no stair at all — just the room seen
      // over the top of it.
      //
      // So the first half of the arrival aims along a PITCH that starts
      // at 26 degrees down, which is exactly what the Graveyard's exit
      // hands over on, and eases toward level as the flight runs out.
      // The lamp only takes over the aim in the second half, and by the
      // end it owns it completely — the last frame of arrival is exactly
      // KEYFRAMES[0], look target included.
      const pitch = THREE.MathUtils.lerp(
        ARRIVAL_PITCH_START,
        ARRIVAL_PITCH_END,
        THREE.MathUtils.smoothstep(t, 0, 0.7),
      );
      heading.current.set(
        pos.current.x,
        pos.current.y + Math.sin(pitch) * ARRIVAL_LOOK_AHEAD,
        pos.current.z - Math.cos(pitch) * ARRIVAL_LOOK_AHEAD,
      );
      look.current.lerpVectors(
        heading.current,
        vecs[0].look,
        THREE.MathUtils.smoothstep(t, 0.45, 1),
      );
      camera.lookAt(look.current);

      // THE LENS IS PART OF THE HANDOFF. The Graveyard runs at 50 and
      // this scene rests at 42, and with the overlay covering the swap
      // now down to half a second, that 8-degree step would read as a
      // lens change at the cut. Spending it here rather than on the
      // Graveyard side does two jobs at once: the incoming frame matches
      // the outgoing one exactly, and the wider lens is what makes the
      // stairwell read as an enclosure at all — at 42 degrees vertical
      // the walls two units either side fall outside the frame and the
      // descent looks like it is happening in open space.
      if (camera.isPerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(50, 42, t);
        camera.updateProjectionMatrix();
      }
      return;
    }

    // Heavier than the Graveyard's already-heavy damping: at this scale
    // any snap reads as a lurch, because the reference objects are only
    // a metre or two away.
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.0004, delta);
    damped.current += (progressRef.current - damped.current) * amount;

    const t = THREE.MathUtils.clamp(damped.current, 0, 1);

    // Map t onto the three [STOPS[i], STOPS[i+1]] segments and ease
    // within whichever one it falls in. Past the last stop the camera
    // simply holds there — extinction plays out on this final frame.
    let segT = 1;
    let a = vecs[vecs.length - 2];
    let b = vecs[vecs.length - 1];
    for (let i = 0; i < STOPS.length - 1; i++) {
      if (t <= STOPS[i + 1] || i === STOPS.length - 2) {
        const span = STOPS[i + 1] - STOPS[i];
        segT = span > 0 ? THREE.MathUtils.clamp((t - STOPS[i]) / span, 0, 1) : 1;
        a = vecs[i];
        b = vecs[i + 1];
        break;
      }
    }
    const e = ease(segT);

    pos.current.lerpVectors(a.pos, b.pos, e);
    camera.position.copy(pos.current);

    look.current.lerpVectors(a.look, b.look, e);
    camera.lookAt(look.current);
  });

  return null;
}
