// src/scenes/Feed/Feed.jsx
//
// Top-level Feed composition. Owns the normalized progression value
// (0-1) driven by wheel input, and the scene's mount boundary. This
// mounts only after Prelude's own [ ENTER ARCHIVE ] completion (see
// App.jsx) — Feed does not fire anything from handshake/connection
// resolution, it just picks up where Prelude's explicit user action
// handed off.
//
// Progress lives in a ref, not React state: wheel events can fire many
// times per second, and FeedCamera only ever needs the latest value
// inside its own useFrame loop, not a re-render. This keeps the
// continuous-input path free of React render churn.
//
// Prelude -> Feed arrival
// -----------------------
// Feed used to begin the instant it mounted: full brightness, full fog
// range, camera dead still at rest. Paired with Prelude's own leaving
// phase ending on a forward dolly into near-total darkness (see
// Prelude.jsx / PreludeScene's LeavingDolly), that static, fully-lit
// first frame read as a hard cut — page A replaced by page B — rather
// than as arriving somewhere.
//
// `arrivalPhase` ("arrival" | "interactive") is Feed's own half of that
// same match cut, following the same internal-phase-machine idiom
// Prelude already uses rather than teaching App.jsx anything about it.
// While "arrival": progress is genuinely held at 0 — arrivalProgressRef
// (GSAP-driven, read every frame by FeedCamera and FeedScene's
// Atmosphere) is a SEPARATE value that eases the camera forward a few
// units and the fog/lights up from near-black to Feed's normal resting
// state, continuing the momentum and darkness Prelude's cut left off on
// without faking route progress. Wheel input is ignored outright during
// arrival (see arrivingRef in the wheel handler below) rather than
// buffered, so nothing left over jumps the camera the instant arrival
// ends. Once arrivalPhase flips to "interactive", FeedCamera and
// Atmosphere both read arrivalProgressRef as fully settled (their own
// `arrival` prop simply turns off) and ordinary progress-driven Feed
// resumes exactly as it always has.
//
// Feed -> Graveyard handoff
// -------------------------
// The route's camera path ends 66 units short of the aperture itself
// (see FeedArchitecture's APERTURE_Z vs ROUTE_END_Z) — the same
// proportion the aperture's own fog-exempt backdrop plane already uses
// to stay a distant destination rather than a wall the camera hits. So
// "crossing" it is authored as reaching the end of the scroll route,
// not clipping through geometry: progress hitting 1 freezes further
// input and fires a single GSAP fade to black (FeedScene dims the key/
// fill/aperture lights and compresses fog toward that same point, so
// the light visibly weakens rather than paying off). Only once the
// screen is fully black does `onThresholdCrossed` fire, so App's scene
// swap to Graveyard is never visible as a swap. Unchanged by the
// arrival work above — the arrival ref and the threshold-exit ref never
// overlap in time (progress cannot reach 1 while progress is held at 0).

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import FeedScene from "./FeedScene";
import { feedFragments } from "../../data/feedFragments";
import "./feed.css";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// Normalizes line-mode wheel deltas (physical mouse notches) against
// pixel-mode (trackpads) so both devices advance progress at a
// comparable rate.
const LINE_HEIGHT_PX = 16;
// Lowered alongside the route rebuild rather than as independent tuning:
// the nave runs ~132 units where the old corridor ran ~38, so the same
// per-pixel progress would have moved the camera three and a half times
// faster through it.
const PROGRESS_PER_PIXEL = 0.00012;

// Arrival duration. Deliberately shorter than Prelude's own 1.5s dolly —
// this is the tail end of one continuous move, not a second act, and by
// the time it starts most of the perceived "distance" has already been
// covered on the Prelude side. Reduced motion collapses this to a brief
// atmospheric clear with no camera movement at all (see FeedCamera/
// Atmosphere's own `arrival` branches — reduceMotion there simply means
// dampedProgress was always 0 and stays 0, so holding position at
// WAYPOINTS[0] the whole time costs nothing extra to support).
const ARRIVAL_DURATION = 1.4;
const ARRIVAL_DURATION_REDUCED = 0.35;

export default function Feed({ onThresholdCrossed }) {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef(null);
  const progressRef = useRef(0);
  const overlayRef = useRef(null);
  const crossingRef = useRef(false);
  const arrivingRef = useRef(true);
  const timelineRef = useRef(null);
  const arrivalProgressRef = useRef(0);
  const arrivalTweenRef = useRef(null);
  const arrivalStartedRef = useRef(false);
  const [arrivalPhase, setArrivalPhase] = useState("arrival");

  useEffect(() => () => timelineRef.current?.kill(), []);
  useEffect(() => () => arrivalTweenRef.current?.kill(), []);

  // Started from FeedScene's onReady (its first actually-rendered frame),
  // not from this component's own mount effect. Starting it at mount
  // measured real elapsed time against the arrival's wall-clock duration
  // while Feed's initial scene graph — columns, vaults, the instanced
  // archive field, eight fragment cards — was still being constructed and
  // uploaded to the GPU, which can itself cost a few hundred milliseconds
  // on a busy frame. Against an arrival only ~1.1s long, that alone was
  // eating enough of the budget that the reveal read as already mostly
  // finished by the time anything actually painted. Guarded to fire once:
  // React StrictMode double-invokes effects in development, and onReady
  // itself could in principle fire more than once if this ever changed.
  const handleSceneReady = useCallback(() => {
    if (arrivalStartedRef.current) return;
    arrivalStartedRef.current = true;

    // Linear on purpose: FeedCamera and Atmosphere each apply their own
    // explicit remap to this raw 0-1 value (deceleration for the camera,
    // a stronger backload for the fog/light reveal) rather than trusting
    // one named GSAP ease to serve two differently-paced things at once —
    // a first pass used "power2.out" here and the reveal was ~75% done
    // by the time the camera was half settled, because a curve gentle
    // enough for the camera was still far too fast for the atmosphere.
    arrivalTweenRef.current = gsap.to(arrivalProgressRef, {
      current: 1,
      duration: reduceMotion ? ARRIVAL_DURATION_REDUCED : ARRIVAL_DURATION,
      ease: "none",
      onComplete: () => {
        arrivingRef.current = false;
        setArrivalPhase("interactive");
      },
    });
  }, [reduceMotion]);

  // Focus follows arrival the same way ArchiveFrame's CTA follows its own
  // phase in Prelude — once Feed is genuinely interactive, not the instant
  // it mounts. rootRef needs tabIndex for this; the alternative (leaving
  // focus wherever Prelude's now-unmounted CTA left it) drops focus to
  // <body>, which loses the visitor's place in the page entirely.
  useEffect(() => {
    if (arrivalPhase === "interactive") rootRef.current?.focus({ preventScroll: true });
  }, [arrivalPhase]);

  const beginCrossing = useCallback(() => {
    const tl = gsap.timeline({ onComplete: () => onThresholdCrossed?.() });
    timelineRef.current = tl;
    tl.to(overlayRef.current, {
      opacity: 1,
      duration: reduceMotion ? 0.4 : 1.3,
      ease: "power2.in",
    });
  }, [reduceMotion, onThresholdCrossed]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;

    // Non-passive so this genuinely owns the gesture rather than letting
    // the browser also interpret it (html/body already have
    // overflow:hidden globally, so this is belt-and-suspenders against
    // scroll-chaining/rubber-banding, not the only thing preventing it).
    const handleWheel = (event) => {
      // Always prevented, even while arriving or crossing — otherwise the
      // page itself would take over the gesture during either.
      event.preventDefault();
      // No buffering: input during arrival is discarded outright rather
      // than queued, so nothing accumulated jumps the camera forward the
      // instant arrival ends.
      if (arrivingRef.current || crossingRef.current) return;

      const pixelDelta = event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
      const next = Math.min(1, Math.max(0, progressRef.current + pixelDelta * PROGRESS_PER_PIXEL));
      progressRef.current = next;

      if (next >= 1) {
        crossingRef.current = true;
        beginCrossing();
      }
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [beginCrossing]);

  return (
    // tabIndex so focus can land here once arrival completes (see the
    // effect above) — this is where a keyboard/AT visitor's focus should
    // actually be once Feed becomes the active scene, since nothing else
    // in Feed is itself focusable.
    <div className="feed-root" ref={rootRef} tabIndex={-1} data-arrival={arrivalPhase}>
      <div className="feed-canvas-layer">
        <FeedScene
          fragments={feedFragments}
          progressRef={progressRef}
          reduceMotion={reduceMotion}
          arrival={arrivalPhase === "arrival"}
          arrivalProgressRef={arrivalProgressRef}
          onReady={arrivalPhase === "arrival" ? handleSceneReady : undefined}
        />
      </div>

      <div className="feed-vignette" aria-hidden="true" />

      <div ref={overlayRef} className="feed-threshold-overlay" aria-hidden="true" />

      <div className="feed-hud" aria-hidden="true">
        ARCHIVE // FEED
      </div>

      <p className="feed-visually-hidden" role="status">
        A vast, ruined social archive crowded with recovered posts, dead screens, and fading traces. Scroll to move forward through it.
      </p>
    </div>
  );
}
