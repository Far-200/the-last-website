// src/scenes/Prelude/PreludeHUD.jsx
//
// Restrained archival HUD around the perimeter: node/network status,
// telemetry, handshake timer, area index, active user. All decorative
// (aria-hidden) — none of this is required for the primary interaction.

import { useEffect, useState } from "react";
import { hud } from "../../data/terminalCopy";

function useElapsedSeconds(startAt) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startAt]);

  return elapsed;
}

function formatClock(totalSeconds) {
  const base = 17; // matches the reference's "00:00:17 AGO" starting point
  const s = base + totalSeconds;
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `00:${mm}:${ss}`;
}

function UserGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 20c0-4 3.5-6 8-6s8 2 8 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PreludeHUD({ connectionState }) {
  const [startAt] = useState(() => Date.now());
  const elapsed = useElapsedSeconds(startAt);

  return (
    <div className="prelude-hud" aria-hidden="true">
      <div className="hud-top-left">
        <div className="hud-node">{hud.topLeft.node}</div>
        <div className="hud-network">{hud.topLeft.network}</div>
      </div>

      <div className="hud-telemetry">
        {hud.telemetry.map((row) => (
          <div key={row.label} className="hud-telemetry-row">
            <div className="hud-telemetry-label">{row.label}</div>
            <div className="hud-telemetry-value">{row.value}</div>
          </div>
        ))}
      </div>

      <div className="hud-top-right">
        <div className="hud-handshake">
          {hud.topRight.handshake} {formatClock(elapsed)} AGO
        </div>
        <div className="hud-response">
          {hud.topRight.response}
          <span
            className={`hud-response-dot${
              connectionState === "connected" ? " hud-response-dot--active" : ""
            }`}
          />
        </div>
      </div>

      <div className="hud-bottom-left">{hud.bottomLeft}</div>

      <div className="hud-bottom-right">
        <div className="hud-user-text">
          <div className="hud-user-label">{hud.bottomRight.label}</div>
          <div className="hud-user-id">{hud.bottomRight.id}</div>
        </div>
        <UserGlyph />
      </div>
    </div>
  );
}
