// src/scenes/Prelude/BootLog.jsx
//
// Lower-left scanning log. Lines reveal progressively on mount rather
// than appearing all at once. The final "failed." line is styled as a
// quiet warning (muted red), matching the reference.
//
// Respects prefers-reduced-motion by revealing all lines immediately.

import { useEffect, useState } from "react";
import { bootLogLines } from "../../data/terminalCopy";

const LINE_DELAY_MS = 420;

export default function BootLog({ reduceMotion = false }) {
  const [visibleCount, setVisibleCount] = useState(
    reduceMotion ? bootLogLines.length : 0,
  );

  useEffect(() => {
    if (reduceMotion) {
      // visibleCount already reflects the full log via lazy init above;
      // nothing to schedule.
      return undefined;
    }

    let cancelled = false;
    let i = 0;

    function step() {
      if (cancelled) return;
      i += 1;
      setVisibleCount(i);
      if (i < bootLogLines.length) {
        setTimeout(step, LINE_DELAY_MS);
      }
    }

    const initial = setTimeout(step, LINE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
  }, [reduceMotion]);

  return (
    <div className="boot-log" aria-hidden="true">
      {bootLogLines.slice(0, visibleCount).map((line, i) => {
        const isFailure = line.includes("failed");
        const isEmpty = line.trim() === "";
        return (
          <div
            key={i}
            className={`boot-log-line${isFailure ? " boot-log-line--fail" : ""}${
              isEmpty ? " boot-log-line--spacer" : ""
            }`}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}
