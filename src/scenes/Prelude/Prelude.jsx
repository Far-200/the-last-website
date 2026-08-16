// src/scenes/Prelude/Prelude.jsx
//
// Top-level Prelude composition. Owns the idle -> connecting -> connected
// state machine locally (per current scope: no Zustand/global store for
// this single interaction). Exposes a single completion boundary —
// `onConnected` — so a future Feed transition can hook in without any
// rewrite here.

import { useCallback, useEffect, useRef, useState } from "react";
import PreludeScene from "./PreludeScene";
import PreludeHUD from "./PreludeHUD";
import ArchiveFragments from "./ArchiveFragments";
import BootLog from "./BootLog";
import { terminalStates, heroCopy, ctaCopy } from "../../data/terminalCopy";
import "./prelude.css";

const HANDSHAKE_MS = 1400;
const INTERFERENCE_MS = 900;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

export default function Prelude({ onConnected }) {
  const [connectionState, setConnectionState] = useState("idle"); // idle | connecting | connected
  const [interference, setInterference] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const timeouts = useRef([]);

  useEffect(() => {
    const pending = timeouts.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  const handleConnect = useCallback(() => {
    if (connectionState !== "idle") return;

    setConnectionState("connecting");

    const t1 = setTimeout(() => {
      setInterference(true);
      const t2 = setTimeout(() => {
        setInterference(false);
        setConnectionState("connected");
        onConnected?.();
      }, INTERFERENCE_MS);
      timeouts.current.push(t2);
    }, HANDSHAKE_MS);

    timeouts.current.push(t1);
  }, [connectionState, onConnected]);

  const ctaLabel =
    connectionState === "connected"
      ? ctaCopy.connected
      : connectionState === "idle"
      ? ctaCopy.idle
      : ctaCopy.connecting;

  return (
    <div className={`prelude-root${interference && !reduceMotion ? " prelude-root--interference" : ""}`}>
      <div className="prelude-canvas-layer">
        <PreludeScene
          reduceMotion={reduceMotion}
          terminalLines={terminalStates[connectionState] ?? terminalStates.idle}
        />
      </div>

      <div className="prelude-floor-glow" aria-hidden="true" />
      <div className="prelude-scanlines" aria-hidden="true" />
      <div className="prelude-grain" aria-hidden="true" />
      <div className="prelude-interference-lines" aria-hidden="true" />
      <div className="prelude-vignette" aria-hidden="true" />

      <PreludeHUD connectionState={connectionState} />
      <ArchiveFragments />

      <div className="prelude-hero" aria-hidden="true">
        <div className="prelude-eyebrow">
          <div className="prelude-eyebrow-line prelude-eyebrow-line--emphasis">
            {heroCopy.eyebrowLine1}
          </div>
          <div className="prelude-eyebrow-line">{heroCopy.eyebrowLine2}</div>
          <div className="prelude-eyebrow-line">{heroCopy.eyebrowLine3}</div>
        </div>
        <div className="prelude-title-wrap">
          <div className="prelude-title">{heroCopy.title}</div>
          <div className="prelude-title-corrupt">{heroCopy.title}</div>
        </div>
      </div>

      <BootLog reduceMotion={reduceMotion} />

      <div className="prelude-cta-block">
        <button
          type="button"
          className={`prelude-cta${connectionState !== "idle" ? " prelude-cta--disabled" : ""}${
            connectionState === "connected" ? " prelude-cta--connected" : ""
          }`}
          onClick={handleConnect}
          disabled={connectionState === "connecting"}
          aria-label="Click to connect to the last surviving node"
        >
          {ctaLabel}
        </button>

        <p className="prelude-warning">
          {ctaCopy.warning.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </p>

        <p className="prelude-thesis">
          {ctaCopy.thesis.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
