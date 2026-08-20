// src/scenes/Prelude/PreludeHUD.jsx
//
// Sparse archival HUD around the perimeter: node/network status, one
// response indicator, and the area index. All decorative (aria-hidden).

import { hud } from "../../data/terminalCopy";

// Peripheral only — enough recovery-system evidence to establish context,
// without surrounding the physical CRT with a telemetry dashboard.
export default function PreludeHUD({ phase }) {
  const isConnected = phase === "system" || phase === "archive" || phase === "leaving";

  return (
    <div className="prelude-hud" aria-hidden="true">
      <div className="hud-top-left">
        <div className="hud-node">{hud.topLeft.node}</div>
        <div className="hud-network">{hud.topLeft.network}</div>
      </div>

      <div className="hud-top-right">
        <div className="hud-response">
          {hud.topRight.response}
          <span
            className={`hud-response-dot${
              isConnected ? " hud-response-dot--active" : ""
            }`}
          />
        </div>
      </div>

      <div className="hud-bottom-left">{hud.bottomLeft}</div>
    </div>
  );
}
