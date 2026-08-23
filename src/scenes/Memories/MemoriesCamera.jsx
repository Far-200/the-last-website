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

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  LAMP_POSITION,
  MEMORY_POSITION,
  VOICEMAIL_POSITION,
  PHOTO_POSITION,
  STOPS,
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

export default function MemoriesCamera({ progressRef, reduceMotion = false }) {
  const damped = useRef(0);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  const vecs = useMemo(
    () => KEYFRAMES.map((k) => ({ pos: new THREE.Vector3(...k.pos), look: new THREE.Vector3(...k.look) })),
    [],
  );

  useFrame(({ camera }, delta) => {
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
