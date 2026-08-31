// src/audio/useAudioEngine.js
//
// The project's entire audio layer: one soundtrack, one instance, two
// authored beats. Deliberately not the general "audio engine" the plan
// once sketched (ambience per area, cue bus, mute state, crossfades) —
// that scope was cut, and what shipped is the one thing the experience
// actually needs: a single continuous bed that starts when the visitor
// chooses to connect and drains away at the end.
//
// OWNERSHIP. App.jsx calls this hook exactly once and App.jsx never
// unmounts, so the HTMLAudioElement below outlives every scene swap by
// construction. That is the whole persistence mechanism — there is no
// context, no provider, no store, and no scene holds a reference to it.
// Scenes only receive the two callbacks (`start`, `drain`) as props, so
// no scene can own, restart, or re-create global playback.
//
// The element is NOT in the React tree. An `<audio>` element rendered by
// App would be re-created by any future conditional-render change to
// App's own return, which is exactly the failure mode this file exists
// to prevent.
//
// AUTOPLAY. Browsers only permit play() from a real user gesture, so
// `start` must be invoked synchronously inside a click handler — see
// Prelude's handleConnect, which calls it on the CONNECT click itself
// rather than waiting for its own leaving animation to finish. play()
// is called before the fade is scheduled for that reason.
//
// FADES. GSAP tweens a plain proxy object and writes `el.volume` in
// onUpdate rather than tweening the element directly: GSAP routes
// unknown properties on a DOM element through CSSPlugin, and `volume`
// is not a CSS property. This is the same GSAP-writes-a-plain-value,
// consumer-applies-it split used for the camera progress refs
// elsewhere in the project.
//
// FAILURE. Audio never gates anything. A missing file, a decode error
// or a rejected play() leaves the experience running in silence, with
// one swallowed rejection and no retry loop.

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";

const SOUNDTRACK_SRC = "/audio/the-last-website-theme.mp3";

// Restrained on purpose. The bed sits under the environment; it is not
// the environment.
const TARGET_VOLUME = 0.18;

const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 4;

export default function useAudioEngine() {
  const audioRef = useRef(null);
  // Guards a single run against duplicate start calls (a double click on
  // CONNECT, a re-entered handler). Cleared once a drain completes, so
  // the next run after [ RECONNECT ] can start the track again.
  const startedRef = useRef(false);
  const fadeRef = useRef(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const el = new Audio(SOUNDTRACK_SRC);
    el.loop = true;
    el.preload = "auto";
    // Silence until CONNECT, and the value the fade-in starts from.
    el.volume = 0;
    audioRef.current = el;
    return el;
  }, []);

  useEffect(() => {
    // Warm the buffer during the awakening sequence, long before the
    // CONNECT click needs it, so playback starts on the gesture instead
    // of after a network round trip.
    ensureAudio().load();

    // Cleanup deliberately keeps `audioRef.current` rather than
    // discarding the element: under StrictMode this effect is mounted,
    // cleaned up and mounted again, and nulling the ref here would
    // create a second element and re-fetch the file. Pausing is enough —
    // and is also the correct behaviour if App ever truly unmounts.
    return () => {
      fadeRef.current?.kill();
      fadeRef.current = null;
      audioRef.current?.pause();
    };
  }, [ensureAudio]);

  // Called synchronously from the CONNECT click. Starts silent and
  // rises to TARGET_VOLUME so the soundtrack arrives under the
  // resolving sequence rather than landing on top of it.
  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const el = ensureAudio();
    fadeRef.current?.kill();
    el.volume = 0;

    const played = el.play();
    if (played && typeof played.catch === "function") {
      played.catch(() => {
        // Blocked, unsupported or failed to decode. Stop the fade so it
        // isn't writing volume to an element that will never sound, and
        // leave the run marked started: the experience continues in
        // silence, and nothing retries.
        fadeRef.current?.kill();
        fadeRef.current = null;
      });
    }

    const level = { volume: 0 };
    fadeRef.current = gsap.to(level, {
      volume: TARGET_VOLUME,
      duration: FADE_IN_SECONDS,
      ease: "sine.inOut",
      onUpdate: () => {
        el.volume = level.volume;
      },
    });
  }, [ensureAudio]);

  // The finale's step 3 — "ambient sound drains toward near-silence".
  // LastMessage owns WHEN this happens; this owns only how it sounds.
  // On completion the track is paused and rewound so a later run
  // started from [ RECONNECT ] begins from the top.
  const drain = useCallback((duration = FADE_OUT_SECONDS) => {
    const el = audioRef.current;
    if (!el) return;

    fadeRef.current?.kill();

    const settle = () => {
      el.pause();
      el.volume = 0;
      try {
        el.currentTime = 0;
      } catch {
        // Seeking can throw if the element never loaded. Nothing to
        // rewind in that case.
      }
      startedRef.current = false;
    };

    if (el.paused || el.volume <= 0) {
      settle();
      return;
    }

    const level = { volume: el.volume };
    fadeRef.current = gsap.to(level, {
      volume: 0,
      duration,
      ease: "sine.in",
      onUpdate: () => {
        el.volume = level.volume;
      },
      onComplete: settle,
    });
  }, []);

  return { start, drain };
}
