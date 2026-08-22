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

import { useEffect, useRef, useState } from "react";
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

export default function Feed() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;

    // Non-passive so this genuinely owns the gesture rather than letting
    // the browser also interpret it (html/body already have
    // overflow:hidden globally, so this is belt-and-suspenders against
    // scroll-chaining/rubber-banding, not the only thing preventing it).
    const handleWheel = (event) => {
      event.preventDefault();
      const pixelDelta = event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
      const next = progressRef.current + pixelDelta * PROGRESS_PER_PIXEL;
      progressRef.current = Math.min(1, Math.max(0, next));
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="feed-root" ref={rootRef}>
      <div className="feed-canvas-layer">
        <FeedScene fragments={feedFragments} progressRef={progressRef} reduceMotion={reduceMotion} />
      </div>

      <div className="feed-vignette" aria-hidden="true" />

      <div className="feed-hud" aria-hidden="true">
        ARCHIVE // FEED
      </div>

      <p className="feed-visually-hidden" role="status">
        An archive of recovered fragments, suspended in the dark. Scroll to move forward through them.
      </p>
    </div>
  );
}
