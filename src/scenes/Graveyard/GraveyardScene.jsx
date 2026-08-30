// src/scenes/Graveyard/GraveyardScene.jsx
//
// The Three.js layer of the Graveyard. Same per-scene Canvas ownership
// as Prelude and Feed — mounted only while Graveyard is the active
// scene, never simultaneously with either. GraveyardCamera is the sole
// continuous camera authority; there is no OrbitControls, no free look.
//
// Lighting is deliberately three sources for the whole scene, and only
// one of them is general:
//
//   * A hemisphere term low enough that it never resolves the space —
//     it exists so unlit faces are charcoal instead of pure black.
//   * A grazing key raking up the route from behind the monument, at
//     about 9 degrees of elevation. Low enough that it describes the
//     ground's shallow relief (see groundHeight.js) rather than
//     flattening it — crests pick up a little light, troughs stay dark —
//     but not so low that it lands on nothing. A first attempt put it at
//     ~2 degrees, where N·L is 0.03 and the ground measured black
//     whatever else was tuned; 9 degrees is the balance between
//     revealing relief and actually delivering light to it.
//   * A LATERAL RAKE PAIR, added in the readability pass. See below.
//   * The monument's own two lights, which belong to it and travel with
//     it (see GraveyardCaptcha).
//
// Intensities are low and the ground's albedo carries the darkness
// instead — see GROUND_STONE in GraveyardArchitecture for why that
// division matters.
//
// Why a lateral rake pair had to be added
// ---------------------------------------
// Measured off the render, before this pass, a grave standing in the
// foreground of the route was RGB(0, 0, 0). Not "dark" — zero. So was a
// grave in the midground. That is not a tuning problem, it is a geometric
// one, and no amount of albedo or fog work could have fixed it:
//
//   The key's direction is normalize(-120, 62, -400) — it travels almost
//   straight DOWN the route, away from the visitor. Every surface the
//   camera can see on an upright marker has a normal with a positive z
//   component, so N.L is negative for all of them and the key contributes
//   exactly nothing to any face the visitor is looking at. It lights the
//   ground (N.L = 0.15) and the BACK of everything standing on it.
//
//   The only other general term was the hemisphere light, and a vertical
//   face sits at its equator, where it returns the average of sky and
//   ground colours — which at these values lands under the 8-bit floor
//   once tone mapping has run.
//
// So the whole cemetery was rendering as pure black cut-outs against a
// slightly-less-black ground, and adding markers could not change that.
// Raising the hemisphere term would have fixed the black but destroyed
// the scene: it is directionless, so it lifts every face of every object
// equally and flattens the site into grey soup.
//
// The fix is two grazing lateral directional lights at about 5 degrees of
// elevation, one either side, quite unequal:
//
//   * RAKE, from +x, the stronger of the two. At 5 degrees a vertical
//     side plane sees N.L = 0.997 while the ground sees 0.087 — a 11x
//     ratio in favour of standing stone before albedo is considered, and
//     grave stone's albedo is itself ~3x the ground's. So it puts roughly
//     35x more light on the side of a marker than on the dirt around it.
//     That ratio is the entire point: it is what makes markers readable
//     WITHOUT making the scene brighter.
//   * COUNTER, from -x and slightly behind the visitor, at about a third
//     the intensity. Its job is only to keep the flank the rake cannot
//     reach at charcoal instead of black, so the field reads
//     black -> charcoal -> faint cold grey rather than black -> grey.
//
// Because both are near-horizontal, which markers catch them depends on
// each marker's own heading, so the field alternates between readable and
// silhouetted instead of lifting as one value. Both are desaturated cold
// greys, both ramp with the same arrival reveal as the key, and neither
// is near the monument's own lighting in strength — the CAPTCHA stays the
// brightest thing in the scene by a wide margin.
//
// Fog does the rest, and its colour is not free: it must stay exactly
// GraveyardArchitecture's HORIZON, because that is the value the
// backdrop gradient already is at eye level. Matching them is what makes
// distant ground dissolve into the sky instead of meeting it at a seam.
// The resting far plane is 380: dense enough that the monument emerges
// over the approach rather than reading as an opening objective, while
// still clear enough for its closing frame.

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import GraveyardCamera from "./GraveyardCamera";
import GraveyardArchitecture, { EYE_HEIGHT, HORIZON } from "./GraveyardArchitecture";
import GraveyardRelics from "./GraveyardRelics";
import GraveyardMemorials from "./GraveyardMemorials";
import GraveMarkerField, { KIT_URL } from "./GraveMarkerField";
import GraveyardEpitaphs from "./GraveyardEpitaphs";
import GraveyardCaptcha from "./GraveyardCaptcha";
import GraveyardThreshold from "./GraveyardThreshold";
import GraveyardExit from "./GraveyardExit";
import { UNDERGROUND_DARK, exitSink } from "./exitLayout";

// The first warmth in the entire experience, and the bridge to Memories,
// used to live here: one amber point light and a low emissive slab on the
// ground, about 28 degrees off the closing camera's aim, appearing only
// after the machine had failed to verify anybody.
//
// The instinct was right and is kept intact. What changed is that the
// warmth now has a physical cause: it leaks from the seams of a service
// door in a concrete head-house standing at almost exactly that same
// bearing, and the visitor can walk into it. See GraveyardExit.jsx, which
// owns every warm value in this scene now — this file deliberately owns
// none of them, so there is one authority for the exit's light rather
// than two ramps that could disagree.
const TRANSITION_DARK = "#0d1112";

// The lateral rake pair (see the header). Deliberately unequal: the rake
// models, the counter only lifts the shadow side off zero.
const RAKE_INTENSITY = 3.4;
const COUNTER_INTENSITY = 1.15;

function ReadySignal({ onReady }) {
  const firedRef = useRef(false);
  useFrame(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReady?.();
  });
  return null;
}

// Readiness here means TWO things, not one.
//
// The first is the same thing Feed already required: a frame has actually
// been rendered, so geometry construction and GPU upload cannot eat the
// visible duration of the arrival.
//
// The second is new, and it is the only genuinely asynchronous asset in
// the whole project: the Blender grave-marker kit (see GraveMarkerField).
// `useGLTF.preload` is called at that module's top level and App imports
// the Graveyard statically, so the fetch actually starts at page boot,
// long before Feed hands over — but "started early" is not "finished".
// If the kit resolved after the arrival had completed, roughly 110
// instanced markers would appear in one frame in a scene the visitor was
// already walking through.
//
// Calling useGLTF here suspends this subtree until the kit has parsed, so
// the arrival clock simply does not start until both conditions hold. The
// cost of being wrong is bounded: Graveyard.jsx keeps a timeout that
// starts the arrival regardless, so a failed or very slow fetch degrades
// to markers popping in rather than to a scene that never begins.
function AssetGate({ onReady }) {
  useGLTF(KIT_URL);
  return <ReadySignal onReady={onReady} />;
}

// Owns the scene fog and its two general lights for both arrival and
// ordinary progression. Monument-local lights remain owned by the
// monument. The same backloaded reveal is passed to Backdrop so its
// fog-exempt sky cannot resolve before fogged geometry does.
function Atmosphere({ arrival, arrivalProgressRef, exitProgressRef }) {
  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const keyRef = useRef(null);
  const rakeRef = useRef(null);
  const counterRef = useRef(null);
  const transitionColor = useRef(new THREE.Color(TRANSITION_DARK));
  const horizonColor = useRef(new THREE.Color(HORIZON));
  const undergroundColor = useRef(new THREE.Color(UNDERGROUND_DARK));
  const fogColor = useRef(new THREE.Color());

  useFrame(() => {
    const raw = arrival ? THREE.MathUtils.clamp(arrivalProgressRef?.current ?? 1, 0, 1) : 1;
    const reveal = arrival ? Math.pow(raw, 3.2) : 1;
    fogColor.current.lerpColors(transitionColor.current, horizonColor.current, reveal);

    // Going underground. `sink` is the exit route's own progress into the
    // stairwell (exitLayout's exitSink), and everything it does here is
    // physically motivated rather than a dissolve: by the time it reaches
    // one the camera is four units below the field inside a concrete
    // shaft with a soffit over it, so there is no sky to light, no
    // horizon to reach and nothing further than a few units away. The
    // general lights go out because the outdoors has gone; the fog
    // arrives at UNDERGROUND_DARK because that is the value of a small
    // enclosed volume lit only by one amber lamp further down — and it is
    // also, not coincidentally, the exact value Memories mounts at.
    const sink = exitSink(THREE.MathUtils.clamp(exitProgressRef?.current ?? 0, 0, 1));
    fogColor.current.lerp(undergroundColor.current, sink);
    const outdoors = 1 - sink * 0.97;

    if (fogRef.current) {
      fogRef.current.color.copy(fogColor.current);
      fogRef.current.near = THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(0.8, 40, reveal),
        0.4,
        sink,
      );
      fogRef.current.far = THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(6.5, 380, reveal),
        8,
        sink,
      );
    }
    const level = (0.05 + 0.95 * reveal) * outdoors;
    if (hemiRef.current) hemiRef.current.intensity = 1.5 * level;
    if (keyRef.current) keyRef.current.intensity = 2.4 * level;
    if (rakeRef.current) rakeRef.current.intensity = RAKE_INTENSITY * level;
    if (counterRef.current) counterRef.current.intensity = COUNTER_INTENSITY * level;
  });

  return (
    <>
      <fog ref={fogRef} attach="fog" args={[TRANSITION_DARK, 0.8, 6.5]} />
      <hemisphereLight ref={hemiRef} args={["#1a2023", "#040506", 0.075]} />
      <directionalLight
        ref={keyRef}
        position={[-120, 62, -400]}
        intensity={0.12}
        color="#88959a"
      />
      {/* See the header. Positions are directions only: both are ~5
          degrees above horizontal so they graze standing stone and
          almost miss the ground. */}
      <directionalLight ref={rakeRef} position={[400, 21, -60]} intensity={0} color="#8d9ba3" />
      <directionalLight
        ref={counterRef}
        position={[-400, 24, 40]}
        intensity={0}
        color="#6a777f"
      />
    </>
  );
}


// Matches GraveyardCamera's first waypoint. Only ever seen for the frame
// before the camera's own useFrame takes over, but a mismatch here shows
// as a visible jump on mount.
const START = [-28, EYE_HEIGHT, 10];

export default function GraveyardScene({
  progressRef,
  reduceMotion,
  captchaPhase,
  onCaptchaActivate,
  arrival = false,
  arrivalProgressRef,
  exit = false,
  exitProgressRef,
  onReady,
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: START, fov: 50, near: 0.4, far: 900 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      {onReady && (
        <Suspense fallback={null}>
          <AssetGate onReady={onReady} />
        </Suspense>
      )}
      <Atmosphere
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
        exitProgressRef={exitProgressRef}
      />

      <GraveyardCamera
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
        exit={exit}
        exitProgressRef={exitProgressRef}
      />

      <GraveyardArchitecture
        arrival={arrival}
        arrivalProgressRef={arrivalProgressRef}
        exitProgressRef={exitProgressRef}
      />
      {/* The ruined archive mouth the visitor walks out of on arrival —
          the far side of FeedThreshold. Static geometry, no phase, no
          camera: it exists so the Graveyard's first frames contain the
          same kind of near-field mass the Feed's last frames did, and the
          forward motion carries across the mount swap. */}
      <GraveyardThreshold />
      <GraveyardRelics />
      <GraveyardMemorials />
      {/* Authored Blender kit — visual test population in one stretch of
          the route (see GraveMarkerField.jsx). Static like the towers and
          relics: it takes no arrival prop and reveals with the scene's
          own fog/light ramp. */}
      <GraveMarkerField />
      {/* The era memorials: eight civic monuments carrying faintly-lit
          archive plates. Static like the rest of the field, and the only
          self-illuminated surfaces in the scene other than the monument —
          see GraveyardEpitaphs.jsx for why, and for how their brightness
          is set against the CAPTCHA's rather than chosen freely. */}
      <GraveyardEpitaphs />
      <GraveyardCaptcha
        progressRef={progressRef}
        reduceMotion={reduceMotion}
        phase={captchaPhase}
        onActivate={onCaptchaActivate}
      />
      {/* The service stair beside the monument: the doorway, the flight
          below it, and every warm value in the scene. Phase-driven, and
          it never touches the camera — GraveyardCamera reads the same
          exit progress and owns the shot through this geometry. */}
      <GraveyardExit phase={captchaPhase} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
