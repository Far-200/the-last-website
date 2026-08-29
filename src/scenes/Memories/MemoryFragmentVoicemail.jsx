// src/scenes/Memories/MemoryFragmentVoicemail.jsx
//
// The second private fragment. Deliberately built as a different object
// from MemoryFragment.jsx's device, not a re-skin of it — "materially
// distinct" per the brief, and it earns that by silhouette rather than
// by colour: a squat machine body with a single thin horizontal readout
// slot (old dot-matrix proportions, roughly 6:1) instead of a phone-like
// rectangle. Nobody looks at this to read a message off a glass panel;
// they'd have listened to it, and what survives is only the transcript a
// machine made of it.
//
// Recovery-through-progression: this fragment is found second, so its
// glow is dimmer than the first (0.24 vs 0.34) and its transcript is
// visibly more damaged — one more small piece of "traces of people
// remain, but they are fading" ahead of Memories' own extinction.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VOICEMAIL_POSITION } from "./layout";

const STRIP_W = 0.62;
const STRIP_H = 0.1;

// Fades out during "dimming1" — the first fragment to go, since it is
// the one the visitor found second-most-recently by the time extinction
// begins and the camera has already moved on from it.
//
// Raised from an original 0.24: measured off an actual render, the
// whole frame at this fragment's own camera distance (~1.9 units, near
// the edge of the lamp's falloff) topped out at 50/255 — and that peak
// was the DOM HUD label in the corner, not scene content at all. This is
// closer to the CAPTCHA interface panel's own fully-revealed value
// (1.25, admittedly at a much larger scale and distance) than to
// fragment one's 0.34, which benefits from also sitting almost directly
// under the lamp.
const EMISSIVE_BASE = 1.0;
// This fragment sits at the far edge of the lamp's falloff, so its own
// light is doing real work: it is what separates the machine body, the
// floor under it and the wall behind it from flat black, and it is the
// reason this stop has any depth at all. Ramped on the fragment's own
// phase table.
const GLOW_INTENSITY = 1.05;

// --- The unheard-message indicator ---------------------------------------
// The one thing this stop was missing. A lit transcript on a box says "a
// machine with writing on it"; it does not say "there is a voice in here
// that nobody has played". The object that says that, unmistakably and
// without a word of UI, is the message counter on an answering machine:
// a single digit, blinking, because the count has not been cleared.
//
// It is deliberately the ONLY indicator on the machine — the brief asks
// for one — and it is chunky hardware type on a recessed readout, not an
// app badge. Beside it sits a small static waveform, which is the other
// half of the sentence: what is waiting is a VOICE, not a notification.
const READOUT_W = 0.42;
const READOUT_H = 0.145;
// High, because this indicator has to win against the machine's own top
// face — which sits directly under the fragment's glow light and is one
// of the brightest surfaces at this stop. A first attempt at 1.35 on a
// flush panel simply dissolved into the lit casing.
const READOUT_EMISSIVE = 3.2;
const GLOW_DISTANCE = 2.1;

const EMISSIVE_BY_PHASE = { dimming1: 0, dimming2: 0, dark: 0, leaving: 0 };

// The readout face: a blinking "1" and a short waveform, drawn once.
function useReadoutTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#050403";
    ctx.fillRect(0, 0, 384, 128);

    // The count. Seven-segment proportions rather than a typeface, so it
    // reads as a machine from the era this thing came from. Thick, because
    // at this stop the readout is 1.9 metres from the camera and a hairline
    // digit is a smudge.
    ctx.fillStyle = "#ffd9a4";
    ctx.fillRect(72, 18, 22, 92);
    ctx.fillRect(40, 40, 32, 20);

    // The waveform: a voice, held. Symmetrical about the centre line and
    // decaying at both ends the way a short recording looks in any
    // transport that has ever displayed one.
    const midY = 64;
    const bars = [10, 20, 34, 24, 50, 62, 40, 70, 54, 30, 44, 60, 38, 22, 14, 8];
    ctx.fillStyle = "#e3b47e";
    bars.forEach((h, i) => {
      const x = 142 + i * 15;
      ctx.fillRect(x, midY - h / 2, 8, h);
    });

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useTranscriptTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0c0806";
    ctx.fillRect(0, 0, 640, 100);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillStyle = "#6b5842";
    ctx.fillText("VOICEMAIL · TRANSCRIBED (auto) · 0:14", 20, 22);

    ctx.font = "italic 20px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#b89968";
    ctx.fillText("hey — call me back when you get this,", 20, 54);
    ctx.fillText("it's not urgent", 20, 80);

    // Heavier degradation than the first fragment — this one was found
    // second, and it should already read as further gone.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    for (const [x, y, w, h] of [
      [0, 30, 640, 5],
      [280, 40, 360, 40],
      [0, 88, 640, 4],
    ]) {
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalCompositeOperation = "source-over";

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export default function MemoryFragmentVoicemail({ phase, reduceMotion }) {
  const map = useTranscriptTexture();
  const readoutMap = useReadoutTexture();
  const materialRef = useRef(null);
  const glowRef = useRef(null);
  const readoutRef = useRef(null);
  const clock = useRef(0);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const target = EMISSIVE_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    smoothed.current += (target - smoothed.current) * amount;
    mat.emissiveIntensity = EMISSIVE_BASE * smoothed.current;
    if (glowRef.current) glowRef.current.intensity = GLOW_INTENSITY * smoothed.current;
    // Blinks on the machine's own slow clock: about a second on, a
    // little under a second off, which is the cadence of a device that
    // has been signalling into an empty room for a very long time. It
    // dies with the rest of the fragment, so when the voice stops being
    // held the light that was holding it stops too.
    if (readoutRef.current) {
      clock.current += delta;
      const on = Math.sin(clock.current * 3.4) > -0.15 ? 1 : 0.05;
      readoutRef.current.emissiveIntensity =
        READOUT_EMISSIVE * smoothed.current * (reduceMotion ? 0.7 : on);
    }
  });

  return (
    <>
      {/* The memory as a light source — see GLOW_INTENSITY above.
          Deliberately NOT a shadow caster: three more shadow maps for
          a light this small would cost far more than it shows, and the
          lamp already owns every shadow in the scene. */}
      <pointLight
        ref={glowRef}
        position={[VOICEMAIL_POSITION[0], VOICEMAIL_POSITION[1] + 0.52, VOICEMAIL_POSITION[2]]}
        intensity={GLOW_INTENSITY}
        distance={GLOW_DISTANCE}
        decay={2}
        color="#d3ac81"
      />
      <group position={VOICEMAIL_POSITION} rotation={[0, 0.42, 0]}>
      {/* The machine body — squat, matte, nothing like a screen. */}
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.78, 0.26, 0.5]} />
        <meshStandardMaterial color="#1b1e22" roughness={0.88} metalness={0.06} />
      </mesh>
      {/* The message counter, flat on the machine's top face. This stop's
          camera pitches 43 degrees down, so the top face is the one
          surface here presented almost square to the visitor — an
          indicator on the front would have been a sliver. */}
      <mesh position={[-0.16, 0.272, -0.02]} rotation={[-Math.PI / 2, 0, 0.02]}>
        <planeGeometry args={[READOUT_W, READOUT_H]} />
        <meshStandardMaterial
          ref={readoutRef}
          map={readoutMap}
          emissiveMap={readoutMap}
          emissive="#d9a86f"
          emissiveIntensity={READOUT_EMISSIVE}
          color="#0a0705"
          roughness={0.45}
          metalness={0.1}
        />
      </mesh>
      {/* A real recess, not a bezel: four short walls standing proud of
          the case with the readout dropped 1.5cm below them. The walls
          shade the panel from the fragment's own glow, which is the only
          way a small emissive display stays darker than the lit casing
          around it — the same problem, and the same fix, as the CAPTCHA
          monument's reveal.
          The panel sits at y 0.272, just ABOVE the case top at 0.26: a
          first attempt put it at 0.246, which is inside the solid body,
          so the display was rendering entirely behind the machine's own
          lid and only a sliver of the digit leaked out at one edge. */}
      {[
        { o: [-0.16, 0.288, -0.02 - READOUT_H / 2 - 0.02], s: [READOUT_W + 0.08, 0.05, 0.04] },
        { o: [-0.16, 0.288, -0.02 + READOUT_H / 2 + 0.02], s: [READOUT_W + 0.08, 0.05, 0.04] },
        { o: [-0.16 - READOUT_W / 2 - 0.02, 0.288, -0.02], s: [0.04, 0.05, READOUT_H + 0.08] },
        { o: [-0.16 + READOUT_W / 2 + 0.02, 0.288, -0.02], s: [0.04, 0.05, READOUT_H + 0.08] },
      ].map((w, i) => (
        <mesh key={i} position={w.o} castShadow receiveShadow>
          <boxGeometry args={w.s} />
          <meshStandardMaterial color="#12171b" roughness={0.9} metalness={0.1} />
        </mesh>
      ))}

      {/* The one readout slot — sits proud of the body's own front face
          (local Z = 0.25), not inside it. Originally placed at Z = 0.2,
          which is 0.05 units BEHIND that face: the strip was a paper-thin
          plane embedded inside a solid box, permanently self-occluded by
          the box's own front wall regardless of how bright its emissive
          was — confirmed by rendering with the scene flooded with light,
          where the box appeared but no strip ever did.
          Z = 0.3, not 0.26: the -0.55 rad tilt sweeps the plane's own
          near edge back toward the box by roughly STRIP_H/2 * sin(0.55)
          ~= 0.026, so 0.26 would have left its lower edge still just
          behind the front face. 0.3 clears it with margin. */}
      <mesh position={[0, 0.21, 0.3]} rotation={[-0.55, 0, 0]}>
        <planeGeometry args={[STRIP_W, STRIP_H]} />
        <meshStandardMaterial
          ref={materialRef}
          map={map}
          emissiveMap={map}
          emissive="#c98a4b"
          emissiveIntensity={EMISSIVE_BASE}
          color="#120d09"
          roughness={0.5}
          metalness={0.06}
        />
      </mesh>
    </group>
    </>
  );
}
