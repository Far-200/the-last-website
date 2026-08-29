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
const GLOW_DISTANCE = 2.1;

const EMISSIVE_BY_PHASE = { dimming1: 0, dimming2: 0, dark: 0, leaving: 0 };

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
  const materialRef = useRef(null);
  const glowRef = useRef(null);
  const smoothed = useRef(1);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    const target = EMISSIVE_BY_PHASE[phase] ?? 1;
    const amount = reduceMotion ? 1 : 1 - Math.pow(0.01, delta);
    smoothed.current += (target - smoothed.current) * amount;
    mat.emissiveIntensity = EMISSIVE_BASE * smoothed.current;
    if (glowRef.current) glowRef.current.intensity = GLOW_INTENSITY * smoothed.current;
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
