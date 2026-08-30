// src/scenes/Graveyard/GraveyardExit.jsx
//
// The way out of the Graveyard, built as a place rather than as a cue.
//
// The CAPTCHA monument was infrastructure before it was a monument, and
// infrastructure has a back door. This is it: a low concrete retaining
// wall holding back an open cut, with a service door in it and a stair
// descending through. It is connected to the machine by the same trunk
// conduit that still enters the monument's base, and it has been standing
// there for the entire scene. Nothing about it is new when it opens —
// what changes is only that a dormant mechanism in it still works.
//
// It is emphatically NOT a reward. The verification did not succeed; the
// machine is still reporting VERIFICATION SERVICE UNAVAILABLE while this
// happens, and its own uplight is dropping away at the same time (see
// GraveyardCaptcha's SPOT_BY_PHASE). The door is a separate surviving
// system, and the scene never explains the coincidence.
//
// Why a wall and not a head-house
// -------------------------------
// The first build of this was a free-standing concrete head with piers, a
// lintel and a roof. Measured off the render it failed in a specific way:
// a box with its own roofline, thirty degrees wide, its top edge only two
// degrees below frame centre, lit from inside. It read as a shed with the
// light on — a second building competing with the monument rather than
// something glimpsed beside it.
//
// The fix was not to dim it. It was to remove the roofline. What stands
// here now is a retaining wall banked into the ground at both ends: no
// top edge against the sky, nothing that reads as a structure with a
// volume, just a face with an opening in it and earth behind. The stair
// beyond it is an open cut with a concrete soffit over the flight, which
// from outside hides the shaft and from inside gives the descent a
// ceiling.
//
// Why the earlier warm cue became this
// ------------------------------------
// The scene used to end with a small amber slab on the ground about 28
// degrees off the closing aim: the first warmth in the whole experience,
// deliberately peripheral and unexplained. That instinct is kept — the
// doorway sits at almost exactly the same bearing, carries exactly the
// same amber, and is still caught out of the corner of the eye. What is
// different is that the warmth now has a physical cause the visitor can
// walk into. A light on the ground can only be looked at; a seam of light
// around a door can be opened.
//
// So the first thing that appears is not a glow but a LEAK, and the leak
// is deliberately NOT a rectangle. The first attempt drew all four gaps
// at even width and full brightness and produced exactly what the brief
// rules out: a glowing amber outline. These three strips are unequal,
// unaligned and partial — the leaf edge runs the full height, the head
// leaks over about two thirds of its width, the sill over half of its
// own, and none of them meets another. That is a door that has dropped on
// its hinges, not a lightbox.
//
// Restraint
// ---------
// No neon, no outline, no beacon, no animated marker, no glow sprite. One
// amber hue (EXIT_AMBER, carried over unchanged from the old cue), three
// point lights whose intensities are set from what they actually have to
// illuminate at their actual distances, and geometry. The door is a heavy
// hinged slab and it moves with weight: its angle is driven through a
// smootherstep so it accelerates and settles instead of sliding at a
// constant rate.
//
// Ownership
// ---------
// This component owns its own continuous values — door angle, seam
// emissive, light intensity — and ramps them from the scene phase inside
// useFrame. It NEVER touches the camera. The camera's route through this
// geometry belongs to GraveyardCamera, and the coordinates both files
// agree on live in exitLayout.js.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  EXIT_X,
  EXIT_Y,
  EXIT_THRESHOLD_Z,
  EXIT_AMBER,
  DOOR_OPEN_ANGLE,
  LANDING_DEPTH,
  STEP_RISE,
  STEP_RUN,
  STEP_COUNT,
} from "./exitLayout";

// Same concrete family as the monument (GraveyardCaptcha's CONCRETE_*),
// a step darker and rougher: this is a service structure, not the face
// the machine presented to the public.
const CONCRETE = "#1d2226";
const CONCRETE_DARK = "#141719";
const STEEL = "#1c2124";
// The shaft interior stays a cool neutral rather than a warm one. Warm
// light landing on warm surfaces resolves to a single sepia value with
// nothing to be warm against — the same failure Memories' own palette had
// to be corrected for. Amber on cold concrete is what makes the stairwell
// read as warm at all.
const SHAFT_STONE = "#1e2226";
const TREAD_STONE = "#23282b";
const EARTH = "#1a1f22";

// --- Phase tables -----------------------------------------------------
// `seam` is the beat where the leak appears and nothing else happens.
// `opening` starts the door. Everything from there stays on.
const SEAM_BY_PHASE = { seam: 1, opening: 1, descending: 1, leaving: 1 };
const SHAFT_BY_PHASE = { opening: 0.6, descending: 1, leaving: 1 };
const DOOR_BY_PHASE = { opening: 1, descending: 1, leaving: 1 };

// Peak intensities. Point lights here are candela with decay 2, so what
// matters is intensity over distance squared at the surface being lit,
// and both of these were set by measuring frames rather than by taste.
//
// The first pass used 340 for the shaft light over a 3-unit throw — an
// irradiance of 38 against concrete at roughly 0.013 linear albedo, which
// rendered as a blown-out white interior visible from twenty-three units
// away. The second pass at 130 still washed the soffit to a flat mid
// orange as soon as the camera reached the doorway, because the
// threshold light sat under a ceiling only 1.9 units above it.
//
// These are the third set. The threshold light is both weaker and lower,
// so the soffit above it falls off instead of being the brightest thing
// in the shot; the shaft light has moved further down the flight so what
// it lights is treads at a grazing angle rather than the back wall
// head-on. The albedos above came down a step at the same time — a lit
// stairwell is dark concrete with light falling across it, not pale
// concrete lit dimly.
const SEAM_LIGHT = 18;
const SHAFT_LIGHT = 85;
const THRESHOLD_LIGHT = 26;
const SEAM_EMISSIVE = 0.85;

// How long the slab takes to swing. Reduced motion shortens the movement
// without removing it — the door still opens, it just stops being a shot.
const DOOR_SECONDS = 3.8;
const DOOR_SECONDS_REDUCED = 1.1;

// Local frame: the group sits at the door's threshold, on the apron.
// Local +z is outward, toward the approaching visitor; local -z runs down
// the shaft. Yaw is deliberately zero — see exitLayout's grid note; a
// rotated shaft would need a much larger hole cut in the ground plane,
// and the obliquity the composition needs is already supplied by the
// camera arriving 23 degrees off this axis.
const APRON_TOP = 0;
const APRON_THICK = 2.6;
const WALL_DEPTH = 7.7;

// Retaining wall. Asymmetric about the doorway on purpose: it runs 5.7
// units past it on one side and 2.7 on the other, so the opening is not
// centred in its own wall.
const WALL_X0 = -7.0;
const WALL_X1 = 4.0;
const WALL_TOP = 3.9;
const DOOR_X0 = -1.3;
const DOOR_X1 = 1.3;
const DOOR_TOP = 3.4;

// Flight geometry, derived rather than authored so the soffit and the
// treads cannot fall out of step.
const LANDING_BACK = -LANDING_DEPTH;
const FLIGHT_RUN = STEP_RUN * STEP_COUNT;
const FLIGHT_DROP = STEP_RISE * STEP_COUNT;
const FLIGHT_END_Z = LANDING_BACK - FLIGHT_RUN;
const SOFFIT_CLEARANCE = 2.9;
const SOFFIT_ANGLE = Math.atan2(FLIGHT_DROP, FLIGHT_RUN);
const SOFFIT_T = 0.5;
const SOFFIT_MID_Z = (LANDING_BACK + FLIGHT_END_Z) / 2;
const SOFFIT_MID_Y = SOFFIT_CLEARANCE - (FLIGHT_DROP / FLIGHT_RUN) * (LANDING_BACK - SOFFIT_MID_Z);
const SOFFIT_LEN = Math.hypot(FLIGHT_RUN, FLIGHT_DROP) + 0.8;

function smootherstep(t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * x * (x * (x * 6 - 15) + 10);
}

// One box, given as an axis-aligned local extent. Every piece of this
// structure is a rectangular concrete element, so authoring by extent
// rather than by centre+size keeps the numbers checkable against
// exitLayout's footprints instead of needing mental arithmetic.
function Slab({ x0, x1, y0, y1, z0, z1, color = CONCRETE, roughness = 0.95 }) {
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} />
    </mesh>
  );
}

// The flight. Thirteen treads, each box deliberately taller than its own
// rise so consecutive steps overlap and no gap can open between them at a
// grazing view angle.
function Stair() {
  const steps = [];
  for (let k = 0; k < STEP_COUNT; k++) {
    const top = APRON_TOP - STEP_RISE * (k + 1);
    const front = LANDING_BACK - STEP_RUN * k;
    steps.push(
      <Slab
        key={k}
        x0={-2}
        x1={2}
        y0={top - 0.62}
        y1={top}
        z0={front - 0.8}
        z1={front}
        color={TREAD_STONE}
        roughness={0.98}
      />,
    );
  }
  return <>{steps}</>;
}

export default function GraveyardExit({ phase, reduceMotion = false }) {
  const doorRef = useRef(null);
  const seamEdgeRef = useRef(null);
  const seamHeadRef = useRef(null);
  const seamSillRef = useRef(null);
  const seamLightRef = useRef(null);
  const shaftLightRef = useRef(null);
  const thresholdLightRef = useRef(null);

  const seamLevel = useRef(0);
  const shaftLevel = useRef(0);
  const doorRaw = useRef(0);

  useFrame((_, delta) => {
    // The leak seeps in rather than switching on — the same very slow
    // approach the scene's previous warm cue used.
    const seamTarget = SEAM_BY_PHASE[phase] ?? 0;
    seamLevel.current = reduceMotion
      ? seamTarget
      : seamLevel.current + (seamTarget - seamLevel.current) * (1 - Math.pow(0.22, delta));

    const shaftTarget = SHAFT_BY_PHASE[phase] ?? 0;
    shaftLevel.current = reduceMotion
      ? shaftTarget
      : shaftLevel.current + (shaftTarget - shaftLevel.current) * (1 - Math.pow(0.3, delta));

    // Weight. A plain exponential ease would start at maximum speed,
    // which is exactly what a heavy slab does not do; advancing a raw
    // ramp at a constant rate and putting the curve on the ANGLE gives
    // the door an accelerating first third and a settling last third.
    const doorTarget = DOOR_BY_PHASE[phase] ?? 0;
    const rate = 1 / (reduceMotion ? DOOR_SECONDS_REDUCED : DOOR_SECONDS);
    doorRaw.current = THREE.MathUtils.clamp(
      doorRaw.current + (doorTarget > doorRaw.current ? delta * rate : -delta * rate),
      0,
      1,
    );
    if (doorRef.current) {
      doorRef.current.rotation.y = smootherstep(doorRaw.current) * DOOR_OPEN_ANGLE;
    }

    const seam = SEAM_EMISSIVE * seamLevel.current;
    if (seamEdgeRef.current) seamEdgeRef.current.emissiveIntensity = seam;
    if (seamHeadRef.current) seamHeadRef.current.emissiveIntensity = seam * 0.7;
    if (seamSillRef.current) seamSillRef.current.emissiveIntensity = seam * 0.45;

    if (seamLightRef.current) seamLightRef.current.intensity = SEAM_LIGHT * seamLevel.current;
    if (shaftLightRef.current) shaftLightRef.current.intensity = SHAFT_LIGHT * shaftLevel.current;
    if (thresholdLightRef.current) {
      thresholdLightRef.current.intensity = THRESHOLD_LIGHT * shaftLevel.current;
    }
  });

  return (
    <group position={[EXIT_X, EXIT_Y, EXIT_THRESHOLD_Z]}>
      {/* --- The poured apron. Four slabs forming a ring around the
              shaft opening. It is not decoration: the ground plane has a
              block of faces removed above the shaft (see
              GraveyardArchitecture's Ground) and this is what covers the
              cut edge, which is quantised to the terrain's own 6.36-unit
              tessellation. Sized from exitLayout's EXIT_GROUND_HOLE. --- */}
      <Slab x0={-4.8} x1={-2.5} y0={-APRON_THICK} y1={APRON_TOP} z0={-13.5} z1={1.9} />
      <Slab x0={2.5} x1={4.4} y0={-APRON_THICK} y1={APRON_TOP} z0={-13.5} z1={1.9} />
      <Slab x0={-2.5} x1={2.5} y0={-APRON_THICK} y1={APRON_TOP} z0={-13.5} z1={-11.7} />
      <Slab x0={-2.5} x1={2.5} y0={-APRON_THICK} y1={APRON_TOP} z0={0} z1={1.9} />

      {/* --- Shaft walls and the back of the cut. --- */}
      <Slab
        x0={-2.5}
        x1={-2}
        y0={-WALL_DEPTH}
        y1={APRON_TOP}
        z0={-11.7}
        z1={0}
        color={SHAFT_STONE}
      />
      <Slab
        x0={2}
        x1={2.5}
        y0={-WALL_DEPTH}
        y1={APRON_TOP}
        z0={-11.7}
        z1={0}
        color={SHAFT_STONE}
      />
      <Slab
        x0={-2}
        x1={2}
        y0={-WALL_DEPTH}
        y1={APRON_TOP}
        z0={-11.7}
        z1={-11.2}
        color={SHAFT_STONE}
      />

      {/* Landing, flight, and the floor it lands on. */}
      <Slab x0={-2} x1={2} y0={-0.6} y1={APRON_TOP} z0={LANDING_BACK} z1={0} color={TREAD_STONE} />
      <Stair />
      <Slab
        x0={-2}
        x1={2}
        y0={-FLIGHT_DROP - 0.3}
        y1={-FLIGHT_DROP}
        z0={-11.7}
        z1={FLIGHT_END_Z + 0.2}
        color={TREAD_STONE}
        roughness={0.98}
      />

      {/* --- The retaining wall. A face with an opening in it, and no
              roofline: the ends are buried in the berms below, so nothing
              here has a silhouette against the sky. --- */}
      <Slab x0={WALL_X0} x1={DOOR_X0} y0={-1.6} y1={WALL_TOP} z0={-0.6} z1={0} />
      <Slab x0={DOOR_X1} x1={WALL_X1} y0={-1.6} y1={WALL_TOP} z0={-0.6} z1={0} />
      <Slab x0={DOOR_X0} x1={DOOR_X1} y0={DOOR_TOP} y1={WALL_TOP} z0={-0.6} z1={0} />
      {/* A corner spalled off the wall above the opening, long ago.
          Damage in the surrounding concrete, not in the mechanism. */}
      <mesh position={[-2.4, 3.55, 0.16]} rotation={[0.12, 0.28, 0.38]}>
        <boxGeometry args={[1.3, 0.8, 0.6]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={1} metalness={0.03} />
      </mesh>
      <mesh position={[-3.1, -0.15, 1.1]} rotation={[0.08, -0.4, 0.16]}>
        <boxGeometry args={[1.5, 0.55, 1.1]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={1} metalness={0.02} />
      </mesh>

      {/* Wing returns holding the cut open behind the wall's ends. */}
      <Slab x0={WALL_X0} x1={WALL_X0 + 0.6} y0={-1.6} y1={WALL_TOP - 0.6} z0={-4.4} z1={-0.6} />
      <Slab x0={WALL_X1 - 0.6} x1={WALL_X1} y0={-1.6} y1={WALL_TOP - 0.9} z0={-3.6} z1={-0.6} />

      {/* Earth banked against the wall at both ends and behind the cut.
          This is what removes the roofline: the structure comes out of
          the ground rather than standing on it. */}
      <mesh position={[-8.4, -0.5, 1.4]} rotation={[0.06, 0.14, 0.09]}>
        <boxGeometry args={[6.4, 3.4, 7.2]} />
        <meshStandardMaterial color={EARTH} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[5.9, -0.75, 1.9]} rotation={[0.05, -0.2, -0.07]}>
        <boxGeometry args={[5.0, 3.0, 6.4]} />
        <meshStandardMaterial color={EARTH} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[-6.2, -1.1, -7.5]} rotation={[0.04, 0.22, 0.05]}>
        <boxGeometry args={[5.2, 2.6, 9.0]} />
        <meshStandardMaterial color={EARTH} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[6.4, -1.2, -8.6]} rotation={[0.05, -0.16, -0.04]}>
        <boxGeometry args={[5.0, 2.4, 8.2]} />
        <meshStandardMaterial color={EARTH} roughness={1} metalness={0} />
      </mesh>

      {/* Soffit over the landing, then over the flight. The step from a
          3.4 clear head at the door to 2.9 over the stair is what makes
          the descent feel like entering something, and from outside these
          two slabs are what keep the open cut from reading as a slot in
          the ground. */}
      <Slab x0={-2.5} x1={2.5} y0={2.9} y1={3.45} z0={LANDING_BACK - 0.1} z1={0} />
      <mesh
        position={[
          0,
          SOFFIT_MID_Y + (SOFFIT_T / 2) * Math.cos(SOFFIT_ANGLE),
          SOFFIT_MID_Z - (SOFFIT_T / 2) * Math.sin(SOFFIT_ANGLE),
        ]}
        rotation={[-SOFFIT_ANGLE, 0, 0]}
      >
        <boxGeometry args={[5, SOFFIT_T, SOFFIT_LEN]} />
        <meshStandardMaterial color={SHAFT_STONE} roughness={0.96} metalness={0.05} />
      </mesh>

      {/* --- The door. Hinged on the left jamb, swinging outward just
              past 90 degrees so the open slab ends up standing proud of
              the wall right beside the camera's line in — near-field
              occlusion the transition gets for nothing. --- */}
      <group ref={doorRef} position={[DOOR_X0, 0, 0]}>
        <mesh position={[1.265, 1.68, 0.13]}>
          <boxGeometry args={[2.53, 3.26, 0.26]} />
          <meshStandardMaterial color={STEEL} roughness={0.8} metalness={0.35} />
        </mesh>
        <mesh position={[0.42, 0.7, 0.28]}>
          <boxGeometry args={[0.72, 0.17, 0.07]} />
          <meshStandardMaterial color="#262c2f" roughness={0.64} metalness={0.5} />
        </mesh>
        <mesh position={[0.42, 2.68, 0.28]}>
          <boxGeometry args={[0.72, 0.17, 0.07]} />
          <meshStandardMaterial color="#262c2f" roughness={0.64} metalness={0.5} />
        </mesh>
        <mesh position={[2.32, 1.62, 0.31]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.4, 0.09, 0.09]} />
          <meshStandardMaterial color="#2e3538" roughness={0.55} metalness={0.6} />
        </mesh>
      </group>

      {/* --- The leak. Three unequal, unaligned strips in the gaps the
              door does not close (see the header note on why they must
              not form a rectangle). They sit just inside the opening, so
              with the door shut they are the only part of what is behind
              it that can be seen, and with the door open they stay as a
              broken frame of light around it. --- */}
      <mesh position={[1.265, 1.7, -0.05]}>
        <planeGeometry args={[0.07, 3.4]} />
        <meshStandardMaterial
          ref={seamEdgeRef}
          color="#0a0806"
          emissive={EXIT_AMBER}
          emissiveIntensity={0}
          roughness={1}
        />
      </mesh>
      <mesh position={[0.4, 3.355, -0.05]}>
        <planeGeometry args={[1.8, 0.09]} />
        <meshStandardMaterial
          ref={seamHeadRef}
          color="#0a0806"
          emissive={EXIT_AMBER}
          emissiveIntensity={0}
          roughness={1}
        />
      </mesh>
      <mesh position={[-0.55, 0.025, -0.05]}>
        <planeGeometry args={[1.5, 0.05]} />
        <meshStandardMaterial
          ref={seamSillRef}
          color="#0a0806"
          emissive={EXIT_AMBER}
          emissiveIntensity={0}
          roughness={1}
        />
      </mesh>

      {/* --- Light. Three point lights, all amber, all ramped from the
              phase in useFrame above. The scene has no shadow casting, so
              the seam light is kept on a short decay radius: at 4.5 units
              it dies inside the reveal instead of washing out through a
              closed door. --- */}
      <pointLight
        ref={seamLightRef}
        position={[0.4, 1.5, -0.8]}
        intensity={0}
        distance={4.5}
        decay={2}
        color={EXIT_AMBER}
      />
      <pointLight
        ref={thresholdLightRef}
        position={[0, 0.6, -2.6]}
        intensity={0}
        distance={9}
        decay={2}
        color={EXIT_AMBER}
      />
      {/* The one that says there is somewhere down there. Placed low and
          well down the flight so its light arrives up the stairs, which
          is what makes the treads read as treads rather than as a lit
          wall at the back. */}
      <pointLight
        ref={shaftLightRef}
        position={[0, -4.6, -9]}
        intensity={0}
        distance={24}
        decay={2}
        color={EXIT_AMBER}
      />

      {/* --- A bent handrail down one wall. Utilitarian detail: this is a
              stair for somebody carrying a toolbag. --- */}
      <mesh position={[-1.82, SOFFIT_MID_Y - 1.85, SOFFIT_MID_Z]} rotation={[-SOFFIT_ANGLE, 0, 0]}>
        <boxGeometry args={[0.07, 0.07, SOFFIT_LEN - 2.2]} />
        <meshStandardMaterial color="#2b3134" roughness={0.6} metalness={0.55} />
      </mesh>
      <mesh position={[-1.82, -0.5, -2.2]}>
        <boxGeometry args={[0.07, 1.1, 0.07]} />
        <meshStandardMaterial color="#2b3134" roughness={0.6} metalness={0.55} />
      </mesh>
      <mesh position={[-1.82, -3.9, -7.4]}>
        <boxGeometry args={[0.07, 1.1, 0.07]} />
        <meshStandardMaterial color="#2b3134" roughness={0.6} metalness={0.55} />
      </mesh>

      {/* --- The trunk conduit. The monument still has one entering its
              base on this side (see GraveyardCaptcha); this is the same
              run, coming out of the wall and heading off toward it. It is
              the only thing that says these two structures were ever one
              installation. --- */}
      <mesh position={[4.9, -0.05, 0.9]} rotation={[0.05, -0.5, 1.52]}>
        <cylinderGeometry args={[0.38, 0.42, 8, 8]} />
        <meshStandardMaterial color={"#22282b"} roughness={0.9} metalness={0.16} />
      </mesh>
      <mesh position={[9.6, -0.22, -3.4]} rotation={[0.08, -0.34, 1.5]}>
        <cylinderGeometry args={[0.34, 0.38, 7.5, 8]} />
        <meshStandardMaterial color={"#1f2528"} roughness={0.92} metalness={0.14} />
      </mesh>
    </group>
  );
}
