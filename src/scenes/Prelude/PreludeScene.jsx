// src/scenes/Prelude/PreludeScene.jsx
//
// The Three.js layer of the Prelude: fixed cinematic camera, restrained
// lighting, fog for depth, a rough ground plane, the CRT, debris, and
// ambient dust. No OrbitControls — this is an authored view.
//
// SIGNAL framing note: the CRT used to sit at the origin, facing the
// camera head-on, with the camera's look-at point landing exactly on its
// screen. That made the screen the compositional subject and turned it
// into a small, centred, cyan rectangle. It is now turned roughly 60°
// away and pushed into the right third, so the camera sees the machine
// at a grazing angle — casing and silhouette, not a presented display.
// The look-at point is empty dark space between the packet-capture text
// (left) and the machine (right), which is the correct subject for a
// depth about the signal outside the machine.
//
// Leaving-phase camera authority
// -------------------------------
// CameraResponse and AmbientLight own position/fog/light for every phase
// except "leaving" — the moment the visitor has actually pressed
// [ ENTER ARCHIVE ], both step aside (see their own `phase === "leaving"`
// guards) and LeavingDolly takes exclusive authority over the camera
// (position, look-at, FOV), the fog, and every light in the scene, all
// driven by the single leavingProgressRef GSAP animates in Prelude.jsx.
// One ref, one reader, one writer per property at any moment — the same
// rule the project already applies to progressRef elsewhere, just with
// an explicit handoff at a phase boundary instead of a single owner for
// the scene's whole lifetime.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CRTTerminal from "../../three/elements/CRTTerminal";
import Debris from "../../three/elements/Debris";
import Particles from "../../three/elements/Particles";
import PreludeEnvironment from "./PreludeEnvironment";

// Metalness dropped from 0.35 to 0.08 and the base value lifted a touch:
// a metallic floor has almost no diffuse response, so the CRT's spill
// light had nothing to pool on. This is now a rough dielectric surface
// that actually catches the screen glow.
//
// This plane is now the SUB-floor. PreludeEnvironment lays a part-collapsed
// access floor of lighter plates over most of the visible area, and what
// shows through the gaps between those plates is this value — so the seams
// read as dark line work rather than as drawn-on detail. It stays a step
// above the old #0a0c0c so a seam is legible as a recess rather than as a
// hole punched into nothing.
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#171b1d" roughness={0.94} metalness={0.06} />
    </mesh>
  );
}

// Ambient light intensities per narrative depth. SIGNAL keeps the
// machine barely present in the darkness; SYSTEM brings it up as the
// visual source of the reconstruction; ARCHIVE/LEAVING ease back down
// as the composition hands weight to the recovered document.
//
// Every value here was multiplied by 10 in the environment pass, and the
// RATIOS between the phases are untouched — SYSTEM is still exactly 3x
// SIGNAL, ARCHIVE still exactly 1.5x. The narrative curve this table
// encodes is unchanged; only its absolute scale moved, alongside the key
// and fill below. See the note on LIGHT INTENSITY SCALE there for why.
// AWAKENING sits below SIGNAL: the room is barely there while the eyes
// are still opening, and SIGNAL's own value arrives as the first thing
// that resolves.
const AMBIENT_BY_PHASE = {
  awakening: 0.5,
  signal: 0.8,
  resolving: 0.8,
  system: 2.4,
  archive: 1.2,
  leaving: 1.0,
};

// --- CONSOLE PRIMACY --------------------------------------------------
// The console's own casing albedo is #222526, set inside the shared
// CRTTerminal element and not this scene's to change (LastMessage mounts
// the same component). Under the room key alone that lands the machine
// DARKER than the floor it stands on, which inverts the focal hierarchy:
// review saw a bright ground plane and a dim box on it.
//
// The fix cannot be more room light, which would raise the floor with it.
// It is a short-range key that belongs to the machine — a light the
// console casts on itself. CRTTerminal already establishes exactly that
// idea with its own bezelLight; this is the same device with enough reach
// to model the casing and pool at its feet, and no further. `distance: 4`
// with decay 2 means it is spent well before it touches the partition,
// the wreck or the background stacks.
//
// Deliberately NEUTRAL-COLD, not cyan. Cyan in this project means the
// physical screen glow and nothing else, and CRTTerminal owns that. If
// this light were cyan the machine would read as brighter rather than as
// the last thing with power, and the one saturated note in the frame
// would stop being scarce.
// Pulled back from 9 after the first render: at that value, sitting 0.75
// units directly in front of the CRT's glass, it lit the screen plane
// itself and the machine read as a bright working monitor. The console is
// supposed to be barely alive. It is now weaker and repositioned up and
// to the front-left so it RAKES the casing rather than facing the glass —
// the screen's own light stays CRTTerminal's business, and this only
// models the box around it.
const CONSOLE_KEY_INTENSITY = 6;

// The machine keeps a low presence even after its screen dies at SYSTEM —
// it still has power, it just has nothing left to display. The cyan is
// what dies (see SCREEN_DEAD_PHASES in CRTTerminal); this does not, which
// is what keeps the console the anchor of every frame rather than only of
// SIGNAL.
const CONSOLE_KEY_BY_PHASE = {
  awakening: 0.4,
  signal: 1,
  resolving: 0.7,
  system: 0.35,
  archive: 0.3,
};

// The screen itself catching. Very short range (distance 1.6) and cyan,
// because this one IS the display and cyan is the display's colour by the
// project's fixed roles. It is what actually flickers at the moment of
// contact — a dead panel finding power, missing, finding it again — and
// what makes "the machine answered" legible as an event rather than as a
// gradual fade-up. Squared against the wake value so the flicker reads
// sharper on the screen than on the casing around it.
const SCREEN_GLOW_INTENSITY = 0.85;

// During "awakening" the console's brightness is a STORY VALUE owned by
// AwakeningDolly (it responds to being touched, not to a phase). From
// SIGNAL onward it goes back to easing toward the per-phase table here.
function ConsoleKey({ phase, reduceMotion, ref, screenRef }) {
  useFrame((_, delta) => {
    if (!ref.current || phase === "leaving" || phase === "awakening") return;
    const level = CONSOLE_KEY_BY_PHASE[phase] ?? 0.3;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.008, delta);
    ref.current.intensity += (CONSOLE_KEY_INTENSITY * level - ref.current.intensity) * amount;
    if (screenRef.current) {
      screenRef.current.intensity +=
        (SCREEN_GLOW_INTENSITY * level * level - screenRef.current.intensity) * amount;
    }
  });

  return (
    <>
      <pointLight
        ref={ref}
        position={[1.35, 1.4, 1.15]}
        intensity={0}
        color="#8fa8ae"
        distance={4}
        decay={2}
      />
      {/* Sat just off the CRT's glass (world ~2.71, 0.78, -0.17), close
          enough that its falloff keeps the cyan on the machine and off
          the room. */}
      <pointLight
        ref={screenRef}
        position={[2.78, 0.82, 0.06]}
        intensity={0}
        color="#7fe3e8"
        distance={1.6}
        decay={2}
      />
    </>
  );
}

// --- On the reach that is not here ----------------------------------
//
// A silhouetted arm reaching toward the console was built for the ACCESS
// beat and cut after three attempts in the real render. It is recorded
// here so nobody rebuilds it without knowing what happened.
//
// Attempt one used a 1.5-unit forearm so the hand could reach far enough
// to overlap the screen: a forearm is a quarter of a metre, so it
// rendered as a pole with a knob on the end. Attempt two thickened it and
// it became a club. Attempt three rebuilt it at true anatomy — a 62cm
// reach, a 19cm hand at 0.8 units from the eye, which is the correct
// first-person scale — and added a squared palm, a set-off thumb and
// separated fingers, because edges and not mass are what make a hand
// legible in silhouette.
//
// It still did not read. The reason is structural rather than a matter of
// more tuning: the cue is a near-black shape against a near-black room,
// so the only thing defining it is its outline, and an outline alone
// carries no scale cue. Every viewer sees an angular dark mass in the
// lower right and has nothing to tell them it is a hand rather than more
// wreckage. Making it lighter to fix that would have meant lighting the
// visitor's own body, which is the thing this whole opening exists not to
// do.
//
// The ACCESS beat is therefore carried by the lean, a genuinely held
// pause, and a two-stage machine response — the brief's own listed
// alternative — and those are working. If this is revisited, the missing
// ingredient is contrast, not geometry.
// Authored at TRUE HUMAN SCALE, which is the correction two renders took
// to find. The first attempt reached the hand two units out so it would
// overlap the console in screen space — but a forearm is a quarter of a
// metre, not two, so what rendered was a pole with a knob on it. Making
// it thicker only turned it into a club.
//
// A real arm cannot reach two units, and it does not need to: the hand
// belongs about 0.8 units from the eye, where a 19cm hand fills roughly a
// third of frame height. That is what a hand looks like in first person,
// and it lands at ~57%/62% of frame — just under the screen — so the
// overlap still reads as contact. Everything here is now within a few
// centimetres of anatomy: 62cm elbow-to-wrist including the shoulder-side
// foreshortening, a 4.5cm wrist, a 7.8cm elbow, a 19x10x6cm hand.
// --- LIGHT INTENSITY SCALE -------------------------------------------
// These were 0.5 and 0.46, which put the whole Prelude an order of
// magnitude below every other scene in the project (Feed runs its
// hemisphere at 12 and its key at 9; the Graveyard's key is 2.4 with a
// far lighter colour). Measured against the ACES + sRGB chain the Canvas
// already applies, the old values landed every surface in this scene at
// roughly RGB 2-6 — present in the scene graph, absent on screen, which
// is why the Prelude read as typography over darkness rather than as a
// machine in a room.
//
// They are constants rather than literals because LeavingDolly is the
// other reader: it drives both lights to near-zero for the Prelude->Feed
// cut and previously restated the same two numbers. A drift between the
// two would have snapped the lighting on the first frame of the leaving
// phase. The leaving BEHAVIOUR — the t^2.4 backload, the 0.96 dim depth,
// the fog collapse, the timing — is unchanged; it now just scales the
// same values this file lights the scene with.
const KEY_INTENSITY = 16;
const FILL_INTENSITY = 9;

// Eases the scene's ambient light toward the target intensity for the
// current phase instead of snapping, so the SIGNAL -> SYSTEM wake and the
// SYSTEM -> ARCHIVE recede read as a slow reconstruction rather than a
// light switch. Skipped under reduced motion, where the target is applied
// directly. Also steps aside once phase is "leaving" — see the header
// note on leaving-phase camera authority — so LeavingDolly is the only
// thing still writing to this ref from that point on.
function AmbientLight({ target, phase, reduceMotion, ref }) {
  useFrame((_, delta) => {
    if (!ref.current || phase === "leaving" || phase === "awakening") return;
    if (reduceMotion) {
      ref.current.intensity = target;
      return;
    }
    const lerpSpeed = 1 - Math.pow(0.001, delta);
    ref.current.intensity += (target - ref.current.intensity) * lerpSpeed;
  });

  return (
    <ambientLight ref={ref} intensity={target} color="#243232" />
  );
}

const CRT_ROOT_POSITION = new THREE.Vector3(2.3, -0.08, -0.4);
const CRT_ROOT_ROTATION_Y = 1.05;
const CRT_ROOT_SCALE = 0.72;
const CRT_SCREEN_LOCAL_CENTER = new THREE.Vector3(0, 1.2, 0.655);
const CRT_ROOT_QUATERNION = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, CRT_ROOT_ROTATION_Y, 0),
);

// Derived from CRTTerminal's root transform and physical glass plane.
const CRT_SCREEN_CENTER = CRT_SCREEN_LOCAL_CENTER.clone()
  .multiplyScalar(CRT_ROOT_SCALE)
  .applyQuaternion(CRT_ROOT_QUATERNION)
  .add(CRT_ROOT_POSITION);
const CRT_SCREEN_NORMAL = new THREE.Vector3(0, 0, 1)
  .applyQuaternion(CRT_ROOT_QUATERNION)
  .normalize();
const CRT_SCREEN_SIZE = [CRT_ROOT_SCALE, 0.8 * CRT_ROOT_SCALE];
const CRT_SCREEN_RIGHT = new THREE.Vector3(1, 0, 0).applyQuaternion(CRT_ROOT_QUATERNION);
const CRT_VIEW_TARGET = CRT_SCREEN_CENTER.clone();
// At 42 degrees vertical FOV this makes the glass about 32% of frame
// height: dominant, with enough room for its bezel and damaged casing.
const CRT_VIEW_DISTANCE = CRT_SCREEN_SIZE[1] /
  (2 * Math.tan(THREE.MathUtils.degToRad(42 / 2)) * 0.32);
const CRT_VIEW_POSITION = CRT_SCREEN_CENTER.clone()
  .addScaledVector(CRT_SCREEN_NORMAL, CRT_VIEW_DISTANCE)
  .addScaledVector(CRT_SCREEN_RIGHT, -0.08)
  .add(new THREE.Vector3(0, 0.08, 0));

const SIGNAL_POSITION = CRT_VIEW_POSITION.toArray();
const SIGNAL_TARGET = CRT_VIEW_TARGET.toArray();
const CAMERA_BY_PHASE = {
  signal: SIGNAL_POSITION,
  resolving: SIGNAL_POSITION,
  system: SIGNAL_POSITION,
  archive: SIGNAL_POSITION,
  leaving: SIGNAL_POSITION,
};

const LOOK_AT = SIGNAL_TARGET;

function CameraResponse({ phase, reduceMotion }) {
  const target = CAMERA_BY_PHASE[phase] ?? CAMERA_BY_PHASE.signal;

  useFrame(({ camera }, delta) => {
    // Steps aside at BOTH ends of the scene's life. AwakeningDolly owns
    // the camera before SIGNAL and LeavingDolly owns it after ARCHIVE;
    // without these guards two writers would set camera.position on the
    // same frame. Same one-value-one-writer rule, now applied at two
    // phase boundaries instead of one.
    if (phase === "leaving" || phase === "awakening") return;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    camera.position.x += (target[0] - camera.position.x) * amount;
    camera.position.y += (target[1] - camera.position.y) * amount;
    camera.position.z += (target[2] - camera.position.z) * amount;
    camera.lookAt(...LOOK_AT);
  });

  return null;
}

// --- Awakening: waking on the floor of the room --------------------
//
// The mirror image of LeavingDolly, at the other end of the scene. While
// phase is "awakening" this is the exclusive writer of camera position,
// look-at, FOV, fog and the ambient/console lights; CameraResponse and
// AmbientLight both step aside on their own guards, and GSAP only
// advances the plain awakeningProgressRef in Prelude.jsx. One ref, one
// reader, one writer — the pattern this file already uses for leaving.
//
// The final AWAKENING_KEYS entry is EXACTLY CAMERA_BY_PHASE.signal plus
// LOOK_AT plus fov 42, so when the phase flips there is nothing to absorb:
// CameraResponse's first frame finds the camera already at its own
// target, and its easing has nothing to do. The seam disappears because
// there is no seam, not because something covers it.
//
// The start pose is LOW — eye height 0.58, on the floor among the
// wreckage — and aimed a little left of the console so the machine sits
// around 59% of frame width and drifts to its authored 71% as the visitor
// rises. The gaze starts ON the machine and settles onto LOOK_AT, which
// is deliberately NOT the machine: you notice the console, then you take
// in the composition it sits in.
// The waking pose chain, as keyframes against awakening progress rather
// than a single start-to-end tween.
//
// A single eased lerp was the note review actually landed on: it read as
// a camera animation, not as a person. Nobody wakes up and rises in one
// continuous motion. This chain is the shape of getting up off a floor —
// a long stretch of barely moving while the eyes work, a partial push up
// onto an elbow, A REST THERE, then the rest of the way; then a lean
// toward the machine, a hold, and finally settling back. The pauses are
// keyframes with almost no delta between them, and they are what stop it
// feeling mechanical.
//
// The last entry is EXACTLY CAMERA_BY_PHASE.signal + LOOK_AT + fov 42, so
// the handoff into SIGNAL still has nothing to absorb.
const AWAKENING_KEYS = [
  // Lying still. Eye height 0.58, gaze already toward the machine.
  { at: 0.0, pos: [0.55, 0.58, 7.15], look: [1.35, 0.95, -0.2], fov: 46 },
  // Still lying — the eyes are doing all the work through here.
  { at: 0.42, pos: [0.53, 0.6, 7.12], look: [1.42, 0.93, -0.2], fov: 46 },
  // Pushed halfway up.
  { at: 0.52, pos: [0.44, 1.0, 6.98], look: [1.58, 0.91, -0.24], fov: 45.2 },
  // And rests there. Almost identical to the frame before it, on purpose.
  { at: 0.6, pos: [0.42, 1.04, 6.94], look: [1.64, 0.9, -0.25], fov: 45 },
  // Upright, looking at the machine.
  { at: 0.66, pos: [0.18, 1.74, 6.48], look: [1.96, 0.87, -0.3], fov: 43.2 },
  // Leaning in toward it — the approach. Half a metre, no more.
  { at: 0.72, pos: [0.18, 1.74, 6.46], look: [2.05, 0.84, -0.28], fov: 43.2 },
  // And STAYS there. This span is nearly a fifth of the whole opening
  // with the camera almost stationary, and it is deliberately the longest
  // hold in the sequence: it is the hesitation, and it is what makes the
  // machine's response afterwards read as an answer to a decision rather
  // than as the next cue on a timeline.
  { at: 0.79, pos: [0.42, 1.66, 5.72], look: SIGNAL_TARGET, fov: 42.5 },
  { at: 0.9, pos: [3.82, 1.08, 2.08], look: SIGNAL_TARGET, fov: 42 },
  { at: 0.97, pos: [4.62, 0.91, 1.16], look: SIGNAL_TARGET, fov: 42 },
  // Settles back, and the gaze comes off the machine onto the frame.
  { at: 1.0, pos: SIGNAL_POSITION, look: SIGNAL_TARGET, fov: 42 },
];

const REDUCED_AWAKENING_KEYS = [
  { at: 0, pos: [4.38, 1.0, 1.5], look: [2.45, 0.82, -0.05], fov: 42.5 },
  { at: 0.52, pos: [4.4, 0.99, 1.47], look: SIGNAL_TARGET, fov: 42.5 },
  { at: 1, pos: SIGNAL_POSITION, look: SIGNAL_TARGET, fov: 42 },
];

const AWAKENING_START = { pos: AWAKENING_KEYS[0].pos, lookAt: AWAKENING_KEYS[0].look, fov: AWAKENING_KEYS[0].fov };

// Fog starts pulled in and opens to the scene's authored [5, 14] as focus
// settles. The far plane starts at 8.5 rather than the 4.2 first tried:
// the console sits about 7.7 units from the waking camera, and at 4.2 it
// was completely fogged out, so the moment the eyelids first part — the
// beat whose entire job is "there is one lit thing in this room" — showed
// nothing but black. The brief is explicit that the visitor must not wake
// into mostly-black-with-shapes, and this is the number that decides it.
const AWAKENING_FOG_START = [1.5, 8.5];
const AWAKENING_FOG_END = [5, 14];

// Interpolates the pose chain above, easing WITHIN each segment rather
// than across the whole span. Easing per segment is what makes each stage
// arrive and settle instead of the camera gliding through all of them at
// one continuous velocity.
const tmpPose = { pos: [0, 0, 0], look: [0, 0, 0], fov: 42 };
function poseAt(t, keys = AWAKENING_KEYS) {
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t <= keys[i + 1].at || i === keys.length - 2) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const span = b.at - a.at;
  const raw = span > 0 ? THREE.MathUtils.clamp((t - a.at) / span, 0, 1) : 1;
  const e = raw * raw * (3 - 2 * raw);
  for (let i = 0; i < 3; i++) {
    tmpPose.pos[i] = THREE.MathUtils.lerp(a.pos[i], b.pos[i], e);
    tmpPose.look[i] = THREE.MathUtils.lerp(a.look[i], b.look[i], e);
  }
  tmpPose.fov = THREE.MathUtils.lerp(a.fov, b.fov, e);
  return tmpPose;
}

function AwakeningDolly({
  phase,
  awakeningProgressRef,
  consoleWakeRef,
  reduceMotion,
  ambientRef,
  consoleRef,
  screenRef,
  fogRef,
}) {
  useFrame(({ camera, clock }) => {
    if (phase !== "awakening") return;

    const t = THREE.MathUtils.clamp(awakeningProgressRef.current, 0, 1);

    // Reduced motion: the camera never moves. It is parked at the settled
    // pose for the whole beat, so the narrative — dark room, eyes
    // opening, a machine that still has power, reaching for it, the
    // machine answering — plays out entirely through the eyelids, the
    // reach and the light. A rising, leaning, FOV-changing first-person
    // camera is precisely the vestibular trigger prefers-reduced-motion
    // exists to avoid, so it is removed rather than shortened.
    const pose = poseAt(t, reduceMotion ? REDUCED_AWAKENING_KEYS : AWAKENING_KEYS);

    // A slow, tiny sway while the visitor is still on the floor — the
    // unsteadiness of a body that has not got up yet. Amplitude is
    // deliberately at the edge of perception (about a centimetre and a
    // half) and it is gone by the time the rise begins, so it reads as
    // presence rather than as a moving camera. This is the single
    // cheapest thing in the sequence that makes it feel inhabited.
    const settle = 1 - THREE.MathUtils.smoothstep(t, 0.44, 0.7);
    const sway = reduceMotion ? 0 : settle;
    const ct = clock.getElapsedTime();

    camera.position.set(
      pose.pos[0] + Math.sin(ct * 0.47) * 0.009 * sway,
      pose.pos[1] + Math.sin(ct * 0.63 + 1.1) * 0.014 * sway,
      pose.pos[2] + Math.sin(ct * 0.39 + 2.3) * 0.007 * sway,
    );
    camera.lookAt(
      pose.look[0] + Math.sin(ct * 0.41 + 0.7) * 0.03 * sway,
      pose.look[1] + Math.sin(ct * 0.55 + 2.0) * 0.025 * sway,
      pose.look[2],
    );
    if (camera.isPerspectiveCamera) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }

    // The room comes up ahead of the move, on a gentler curve, so there
    // is something to have noticed before the visitor starts rising
    // toward it.
    const reveal = reduceMotion ? Math.min(1, t * 1.6) : THREE.MathUtils.smoothstep(t, 0.02, 0.5);
    if (fogRef.current) {
      fogRef.current.near = THREE.MathUtils.lerp(AWAKENING_FOG_START[0], AWAKENING_FOG_END[0], reveal);
      fogRef.current.far = THREE.MathUtils.lerp(AWAKENING_FOG_START[1], AWAKENING_FOG_END[1], reveal);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = AMBIENT_BY_PHASE.awakening * reveal;
    }

    // The machine's own state, driven by the timeline in Prelude.jsx:
    // a faint standby while it is only being noticed, then the flicker
    // and catch when it is actually touched. This is the value that makes
    // the console the subject rather than a lit prop — it is the only
    // thing in the room whose brightness is a RESPONSE to something.
    const wake = THREE.MathUtils.clamp(consoleWakeRef.current, 0, 1);
    if (consoleRef.current) {
      consoleRef.current.intensity = CONSOLE_KEY_INTENSITY * wake;
    }
    if (screenRef.current) {
      screenRef.current.intensity = SCREEN_GLOW_INTENSITY * wake * wake;
    }
  });

  return null;
}

// --- Leaving: the forward dolly into Feed --------------------------
// Position, look-at and FOV ease from the archive frame's resting pose
// toward a frame chosen to match Feed's own opening shot as closely as
// perceptual continuity requires: eye height close to Feed's EYE_HEIGHT
// (1.75), a near-level/slightly-upward gaze (Feed looks ~2 degrees up,
// see FeedCamera's LOOK_RISE), and FOV widened to Feed's own 52 so there
// is no FOV snap at the cut. World coordinates between the two scenes
// mean nothing to each other — only the eye's read of the frame does.
const LEAVING_START = { pos: SIGNAL_POSITION, lookAt: SIGNAL_TARGET, fov: 42 };
const LEAVING_END_POSITION = CRT_SCREEN_CENTER.clone()
  .addScaledVector(CRT_SCREEN_NORMAL, -0.08)
  .toArray();
const LEAVING_END_TARGET = CRT_SCREEN_CENTER.clone()
  .addScaledVector(CRT_SCREEN_NORMAL, -1)
  .toArray();
const LEAVING_END = { pos: LEAVING_END_POSITION, lookAt: LEAVING_END_TARGET, fov: 52 };

// Fog tightens toward the camera over the same span, so the world goes
// dark because the visitor is pushing into it, not because a value is
// fading in front of it. #020202 (see the Canvas's <fog> below) is close
// enough to true black that a fully tightened fog reads as darkness by
// itself — no separate "fade to black" step is needed on top of it.
const LEAVING_FOG_START = [5, 14];
const LEAVING_FOG_END = [0.3, 1.8];

function LeavingDolly({
  phase,
  leavingProgressRef,
  reduceMotion,
  ambientRef,
  directionalRef,
  pointRef,
  consoleRef,
  screenRef,
  fogRef,
}) {
  useFrame(({ camera }) => {
    if (phase !== "leaving") return;

    // Reduced motion: no translation, no FOV change, no fog move — the
    // camera stays exactly where CameraResponse's own easing last left
    // it (already close to LEAVING_START, since "archive" and "leaving"
    // share nearly the same pose). Only the lights still dim, and only
    // briefly (see Prelude.jsx's shorter reduced-motion duration) — an
    // opacity-like value change carries no vestibular risk the way a
    // moving camera does.
    const raw = THREE.MathUtils.clamp(leavingProgressRef.current, 0, 1);
    const t = THREE.MathUtils.smoothstep(raw, reduceMotion ? 0.04 : 0.12, 1);
    {
      camera.position.set(
        THREE.MathUtils.lerp(LEAVING_START.pos[0], LEAVING_END.pos[0], t),
        THREE.MathUtils.lerp(LEAVING_START.pos[1], LEAVING_END.pos[1], t),
        THREE.MathUtils.lerp(LEAVING_START.pos[2], LEAVING_END.pos[2], t),
      );
      camera.lookAt(
        THREE.MathUtils.lerp(LEAVING_START.lookAt[0], LEAVING_END.lookAt[0], t),
        THREE.MathUtils.lerp(LEAVING_START.lookAt[1], LEAVING_END.lookAt[1], t),
        THREE.MathUtils.lerp(LEAVING_START.lookAt[2], LEAVING_END.lookAt[2], t),
      );
      if (camera.isPerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(LEAVING_START.fov, LEAVING_END.fov, t);
        camera.updateProjectionMatrix();
      }
    }

    // Darkness is backloaded (t^2.4) rather than linear: the frame stays
    // readable through most of the push and then swallows itself in the
    // final stretch, which is what makes the occlusion read as "extremely
    // short" against a "deliberate" forward move rather than the whole
    // beat being one long fade.
    const darkT = THREE.MathUtils.smoothstep(t, 0.68, 1);

    if (fogRef.current) {
      fogRef.current.near = THREE.MathUtils.lerp(LEAVING_FOG_START[0], LEAVING_FOG_END[0], darkT);
      fogRef.current.far = THREE.MathUtils.lerp(LEAVING_FOG_START[1], LEAVING_FOG_END[1], darkT);
    }
    const dim = 1 - darkT * 0.96;
    if (ambientRef.current) ambientRef.current.intensity = AMBIENT_BY_PHASE.leaving * dim;
    if (directionalRef.current) directionalRef.current.intensity = KEY_INTENSITY * dim;
    if (pointRef.current) pointRef.current.intensity = FILL_INTENSITY * dim;
    if (consoleRef.current) {
      const response = THREE.MathUtils.lerp(CONSOLE_KEY_BY_PHASE.archive, 0.72, 1 - Math.pow(1 - t, 3));
      consoleRef.current.intensity = CONSOLE_KEY_INTENSITY * response * dim;
    }
    if (screenRef.current) {
      const level = THREE.MathUtils.lerp(CONSOLE_KEY_BY_PHASE.archive, 1, 1 - Math.pow(1 - t, 3));
      screenRef.current.intensity = SCREEN_GLOW_INTENSITY * level * level * dim;
    }
  });

  return null;
}

// The pose the Canvas is constructed at. It must be AWAKENING_START, not
// the signal pose: the very first painted frame is behind fully closed
// eyelids, but any frame that leaks before GSAP's first tick would
// otherwise show the settled composition and give the ending away.
const INITIAL_POSE = AWAKENING_START;

export default function PreludeScene({
  reduceMotion = false,
  phase = "signal",
  leavingProgressRef,
  awakeningProgressRef,
  consoleWakeRef,
}) {
  const ambientIntensity = AMBIENT_BY_PHASE[phase] ?? AMBIENT_BY_PHASE.signal;
  const ambientRef = useRef(null);
  const directionalRef = useRef(null);
  const pointRef = useRef(null);
  const consoleRef = useRef(null);
  const screenRef = useRef(null);
  const fogRef = useRef(null);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: INITIAL_POSE.pos, fov: INITIAL_POSE.fov }}
      onCreated={({ camera }) => {
        camera.lookAt(...INITIAL_POSE.lookAt);
      }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      }}
    >
      {/* Transparent canvas lets the DOM ghost title show through empty space.
          Fog opens at the awakening's tight [0.6, 4.2] and AwakeningDolly
          eases it to this authored [5, 14] as focus settles. */}
      <fog ref={fogRef} attach="fog" args={["#020202", 1.5, 8.5]} />
      <CameraResponse phase={phase} reduceMotion={reduceMotion} />
      {awakeningProgressRef && consoleWakeRef && (
        <AwakeningDolly
          phase={phase}
          awakeningProgressRef={awakeningProgressRef}
          consoleWakeRef={consoleWakeRef}
          reduceMotion={reduceMotion}
          ambientRef={ambientRef}
          consoleRef={consoleRef}
          screenRef={screenRef}
          fogRef={fogRef}
        />
      )}
      {leavingProgressRef && (
        <LeavingDolly
          phase={phase}
          leavingProgressRef={leavingProgressRef}
          reduceMotion={reduceMotion}
          ambientRef={ambientRef}
          directionalRef={directionalRef}
          pointRef={pointRef}
          consoleRef={consoleRef}
          screenRef={screenRef}
          fogRef={fogRef}
        />
      )}

      {/* Enough ambient/rim light to reveal the dark casing silhouette.
          Eases toward each phase's target rather than staying fixed. */}
      <AmbientLight ref={ambientRef} target={ambientIntensity} phase={phase} reduceMotion={reduceMotion} />

      {/* The room's key, raking in from the upper front left. Its colour
          was #465d5d — a saturated teal only a step off the CRT's own
          #7fe3e8. Now that the key is actually delivering light, that
          hue would have made the whole room the same colour as the one
          thing in it that is supposed to be alive. Shifted a little
          bluer and further off the cyan axis so the console's glow stays
          the only saturated source in the frame, exactly as scarce as
          before but now with somewhere to be scarce against. */}
      {/* Dropped from y 4 to y 3 and pushed out to x -5, which halves the
          floor's N·L and roughly doubles it on anything vertical. The
          floor is the largest surface in every frame and had the highest
          incidence of anything in the scene, so a high key made the
          ground the brightest thing on screen and pulled the eye down and
          away from the console. Raking it instead means the floor
          describes its own seams and relief while the stacks, the wreck
          and the brace get the light that actually carves silhouettes.
          Intensity rises with the angle purely to hold the same floor
          value at a shallower incidence. */}
      <directionalLight
        ref={directionalRef}
        position={[-5, 3, 2.6]}
        intensity={KEY_INTENSITY}
        color="#4d5f66"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Cold fill sitting just past the console, reaching only as far as
          the near background stacks (distance 8, decay 2). It is what
          separates the mid depth band from the far one — the forms it
          reaches keep an edge, the forms past it fall to the fog. Same
          hue correction as the key above, for the same reason. */}
      <pointLight
        ref={pointRef}
        position={[0, 2.2, -1.5]}
        intensity={FILL_INTENSITY}
        color="#2e3c42"
        distance={8}
        decay={2}
      />

      {/* The machine's own key — see the CONSOLE PRIMACY note above. */}
      <ConsoleKey
        ref={consoleRef}
        screenRef={screenRef}
        phase={phase}
        reduceMotion={reduceMotion}
      />

      <Ground />

      {/* The room the console is standing in — floor plates, the toppled
          rack in the near left, the broken brace overhead and the stacks
          behind. Static authored geometry with no lights and no per-frame
          work of its own; see PreludeEnvironment for how each band is
          composed against this camera's actual frustum. */}
      <PreludeEnvironment />

      {/* Off-centre and turned ~60° away from the view axis. At this
          angle the screen plane presents as a thin sliver rather than a
          face-on rectangle, and its glow reaches the composition only as
          spill on the floor. Scale is handled inside CRTTerminal. */}
      <CRTTerminal
        position={CRT_ROOT_POSITION.toArray()}
        rotation={[0, CRT_ROOT_ROTATION_Y, 0]}
        phase={phase}
        reduceMotion={reduceMotion}
        wakeRef={consoleWakeRef}
      />

      <Debris />
      <Particles reduceMotion={reduceMotion} />
    </Canvas>
  );
}
