// src/scenes/Feed/FeedFragment.jsx
//
// A single archive fragment embedded in the nave. Most are static
// recovered traces; the one flagged `reconstructable` supports a
// discrete, GSAP-authored reconstruction moment on activation. That
// timeline only touches this fragment's own DOM/light refs — never the
// camera, which stays owned entirely by FeedCamera.
//
// Making DOM behave like an object in the world
// ---------------------------------------------
// `<Html>` is browser DOM. It is not fogged, not lit, and not tone
// mapped, so left alone a card 60 units down the nave renders at exactly
// the same brightness as one two units from the lens, always drawn over
// everything. That is why the previous pass read as HTML floating over a
// black canvas: by construction the cards could not be *in* the space.
// Two things fix it, and both are required.
//
// 1. OCCLUSION. `occlude="blending"` — not the raycast mode. The old
//    comment here was right to reject `occlude={true}`: that mode
//    raycasts each anchor against the whole scene and flips the element
//    to `display:none`, which in a colonnade produces exactly the
//    order-dependent flicker it warned about. `"blending"` is a
//    different mechanism: drei raises the canvas above the DOM in
//    stacking order and renders an invisible depth-only plane at the
//    card, so geometry in front of the card covers it per-pixel while
//    geometry behind it is depth-rejected and leaves the canvas
//    transparent. It is deterministic and has no raycast cost.
//
//    That mechanism is why the card CSS must be fully opaque: the card
//    is a hole punched through the render, and whatever is not covered
//    by the card's own background shows the page behind the canvas.
//
// 2. DISTANCE FADE. Occlusion alone still leaves every card equally
//    bright at every depth. The fade below blends the card toward the
//    same haze value the fog and the page background use, so a distant
//    fragment recedes with the architecture instead of punching through
//    it. This is what actually makes them read as embedded.
//
// The old backing mesh is gone. It existed to give the card a physical
// substrate, but under blending occlusion the card's own depth plane is
// the substrate, and a second transparent plane at the same position
// would only be depth-rejected by it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import { useDepthFade } from "./useDepthFade";

// The card's CSS width. Physical size in the world is
// `CARD_WIDTH_PX * distanceFactor / 400`, so this is the constant that
// converts an authored world width into a drei distanceFactor. Keep it
// in step with `.feed-frag`'s width in feed.css.
const CARD_WIDTH_PX = 220;

function htmlDistanceFactor(fragment) {
  return (fragment.width * 400) / CARD_WIDTH_PX;
}

function FragmentBody({ fragment }) {
  const { kind, content } = fragment;

  if (kind === "post") {
    return (
      <>
        <div className="feed-frag-meta">
          {content.handle} · {content.timestamp}
        </div>
        <div className="feed-frag-body">{content.body}</div>
      </>
    );
  }

  if (kind === "chat") {
    return (
      <>
        <div className="feed-frag-title">{content.title}</div>
        <div className="feed-frag-chat">
          {content.lines.map((line, i) => (
            <div key={i} className="feed-frag-chat-line">
              {line}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (kind === "upload") {
    return (
      <>
        <div className="feed-frag-title">{content.filename}</div>
        <div className="feed-frag-upload-track">
          <div className="feed-frag-upload-fill" style={{ width: content.percent }} />
        </div>
        <div className="feed-frag-meta">stalled at {content.percent}</div>
      </>
    );
  }

  if (kind === "log") {
    return (
      <>
        <div className="feed-frag-title">{content.title}</div>
        {content.lines.map((line, i) => (
          <div key={i} className="feed-frag-log-line">
            {line}
          </div>
        ))}
      </>
    );
  }

  if (kind === "missing") {
    return (
      <>
        <div className="feed-frag-missing-icon" aria-hidden="true">
          ×
        </div>
        <div className="feed-frag-title">{content.filename}</div>
        <div className="feed-frag-meta">{content.caption}</div>
      </>
    );
  }

  if (kind === "metadata") {
    return (
      <>
        <div className="feed-frag-title">{content.title}</div>
        {content.fields.map((field) => (
          <div key={field.label} className="feed-frag-field">
            <span className="feed-frag-field-label">{field.label}</span>
            <span className="feed-frag-field-value">{field.value}</span>
          </div>
        ))}
      </>
    );
  }

  return null;
}

// A very small number of fragments carry a literal, dying-display glow —
// physically motivated (a stalled upload and a failed image fetch, both
// still drawing power), not a UI accent. Cyan stays exclusive to physical
// screen glow, kept dirty, dim and localized. Now that there is
// architecture around the fragments, this light lands on something: it
// pools on the nearby column and floor rather than on nothing. Fully
// static under reduced motion.
//
// The light used to be the whole of it, and the frame paid for that: the
// visual audit found no Feed frame that read as POWERED, only as
// abandoned, because a pool of cyan on a column has no visible cause. The
// readout below is that cause — the machine, still cycling, for an upload
// nobody is coming back to finish.
//
// Base emission of the readout strip, in the renderer's working (linear)
// space — this is "#4a7a7d" converted once, so the strip and the point
// light above it are literally the same colour rather than two cyans that
// could drift apart. Scaled by the flicker every frame, so the bar and the
// light it throws rise and fall together.
const READOUT_LINEAR = [0.0685, 0.2218, 0.2332];
// How much of that base the bar actually emits at peak. Swept in source
// against the mid-route frame and measured at the strip's own projected
// pixel, where the local background is 50 and the aperture backdrop — the
// frame's intended brightest thing — is 140:
//
//   0.45 -> 50   (invisible; identical to the unlit frame)
//   1.00 -> 64-86
//   1.60 -> 92-118
//   2.40 -> 129-148  (reaches the aperture; rejected)
//
// 1.6 is the value where the bar is legible within a second without
// touching the aperture. The spread in each pair is the flicker, sampled
// two seconds apart.
const READOUT_GAIN = 1.6;

function DyingScreenGlow({ fragment, reduceMotion }) {
  const lightRef = useRef(null);
  const readoutRef = useRef(null);

  // Sized and placed off the same proportion ScreenHousings uses for this
  // fragment's backplate (width * 0.78), so the bar lands on the housing's
  // lower margin — on the machine — instead of floating in front of the
  // card. See FeedInfrastructure's ScreenHousings.
  const readout = useMemo(() => {
    const backplateHeight = fragment.width * 0.78;
    return {
      position: [0, -backplateHeight / 2 + 0.1, 0.06],
      size: [fragment.width * 0.34, 0.075, 0.012],
    };
  }, [fragment.width]);

  useFrame(({ clock }) => {
    const level = reduceMotion
      ? 0.5
      : (() => {
          const t = clock.getElapsedTime();
          return 0.38 + Math.max(0, Math.sin(t * 0.7) * Math.sin(t * 0.23)) * 0.32;
        })();

    if (lightRef.current) lightRef.current.intensity = level;
    // setRGB writes into the existing Color in the working colour space —
    // no allocation, and no second animation system: the one value above
    // drives both the lamp and its visible source.
    if (readoutRef.current) {
      const k = level * READOUT_GAIN;
      readoutRef.current.material.color.setRGB(
        READOUT_LINEAR[0] * k,
        READOUT_LINEAR[1] * k,
        READOUT_LINEAR[2] * k,
      );
    }
  });

  return (
    <>
      <pointLight
        ref={lightRef}
        position={[0, 0, 0.5]}
        color="#4a7a7d"
        intensity={0.5}
        distance={7}
        decay={2}
      />

      {/* The physical source this light has always claimed to have. A
          status bar on the housing, still cycling for an upload that
          stopped years ago — unlit material on purpose, because a screen
          emits rather than receives, and fogged like everything else so
          the arrival reveal and the threshold collapse still swallow it
          instead of leaving a lit dot in a black frame. */}
      <mesh ref={readoutRef} position={readout.position}>
        <boxGeometry args={readout.size} />
        <meshBasicMaterial color="#4a7a7d" />
      </mesh>
    </>
  );
}

function ReconstructableFragment({ fragment, reduceMotion }) {
  const [recovered, setRecovered] = useState(false);
  const noiseRef = useRef(null);
  const corruptedRef = useRef(null);
  const recoveredRef = useRef(null);
  const glowRef = useRef(null);
  const timelineRef = useRef(null);
  const fadeRef = useDepthFade(fragment.position);

  useEffect(() => () => timelineRef.current?.kill(), []);

  const handleReconstruct = useCallback(() => {
    if (recovered) return;
    setRecovered(true);

    // Reduced motion keeps the same authored order (settle -> reveal ->
    // preserve) at a compressed pace, rather than cutting straight in.
    const s = reduceMotion ? 0.35 : 1;
    const tl = gsap.timeline();
    timelineRef.current = tl;

    tl.to(noiseRef.current, { opacity: 0, duration: 0.45 * s, ease: "power1.out" })
      .to(corruptedRef.current, { opacity: 0, duration: 0.3 * s }, "<0.05")
      .to(recoveredRef.current, { opacity: 1, duration: 0.4 * s }, "<0.1")
      .to(glowRef.current, { intensity: 2.4, duration: 0.3 * s }, "<")
      .to(glowRef.current, { intensity: 0.7, duration: 0.7 * s });
  }, [recovered, reduceMotion]);

  const { content } = fragment;

  return (
    <group position={fragment.position} rotation={fragment.rotation}>
      {/* Amber, not cyan: this is a reconstruction accent on a recovered
          fragment, not a physical CRT screen glow. It throws onto the
          surrounding stone, which is the point of putting the fragment
          against architecture in the first place. */}
      <pointLight
        ref={glowRef}
        position={[0, 0, 0.6]}
        color="#c98a4b"
        intensity={0}
        distance={11}
        decay={2}
      />

      <Html
        transform
        occlude="blending"
        distanceFactor={htmlDistanceFactor(fragment)}
        style={{ pointerEvents: "auto" }}
      >
        <div ref={fadeRef} className="feed-frag feed-frag--reconstructable">
          <div ref={noiseRef} className="feed-frag-noise" aria-hidden="true" />

          <div ref={corruptedRef} className="feed-frag-layer">
            <div className="feed-frag-meta">
              {content.handleCorrupted} · {content.timestampCorrupted}
            </div>
            <div className="feed-frag-body">{content.bodyCorrupted}</div>
          </div>

          <div ref={recoveredRef} className="feed-frag-layer feed-frag-layer--recovered">
            <div className="feed-frag-meta">
              {content.handleRecovered} · {content.timestampRecovered}
            </div>
            <div className="feed-frag-body">{content.bodyRecovered}</div>
          </div>

          {!recovered ? (
            <button
              type="button"
              className="feed-recover-btn"
              onClick={handleReconstruct}
              aria-label="Reconstruct this fragment"
            >
              [ RECOVER ]
            </button>
          ) : (
            <div className="feed-frag-preserved" aria-hidden="true">
              // preserved
            </div>
          )}

          <p className="feed-visually-hidden" role="status">
            {recovered
              ? `Fragment recovered: ${content.handleRecovered}, ${content.bodyRecovered}`
              : ""}
          </p>
        </div>
      </Html>
    </group>
  );
}

function StaticFragment({ fragment, reduceMotion }) {
  const fadeRef = useDepthFade(fragment.position);

  return (
    <group position={fragment.position} rotation={fragment.rotation}>
      {fragment.screenGlow ? (
        <DyingScreenGlow fragment={fragment} reduceMotion={reduceMotion} />
      ) : null}

      <Html
        transform
        occlude="blending"
        distanceFactor={htmlDistanceFactor(fragment)}
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={fadeRef}
          className={`feed-frag feed-frag--${fragment.kind}${fragment.dim ? " feed-frag--dim" : ""}`}
        >
          <FragmentBody fragment={fragment} />
        </div>
      </Html>
    </group>
  );
}

export default function FeedFragment({ fragment, reduceMotion }) {
  if (fragment.reconstructable) {
    return <ReconstructableFragment fragment={fragment} reduceMotion={reduceMotion} />;
  }

  return <StaticFragment fragment={fragment} reduceMotion={reduceMotion} />;
}
