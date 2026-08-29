// src/scenes/Graveyard/GraveyardEpitaphs.jsx
//
// The Graveyard's era memorials: eight civic monuments, each a plinth
// carrying a recessed archive plate that is still very faintly lit. Copy
// and placement live in src/data/graveyardEpitaphs.js — see that file for
// why these are a different object from the hero graves next to them.
//
// Why these are lit at all, when nothing else in the field is
// -------------------------------------------------------------
// Every other surface in this scene is pure albedo under the site's own
// lights. These plates are the one exception, and the exception is the
// point: an archive plate that has outlived the thing it commemorates and
// is still drawing power is a specific, sad object, and it is the same
// idea the CAPTCHA is built on — a machine left running because nobody
// was left to switch it off. It also solves a practical problem, because
// engraved text at the distance this camera passes at is unreadable
// without SOME self-illumination.
//
// The brightness is therefore set against the monument, not chosen for
// legibility alone. GraveyardCaptcha's panel ramps its emissiveIntensity
// to 1.25 and measures ~177 at the peak of its glyphs. These plates sit
// at a fixed 0.22 and measured 68 against the CAPTCHA's 176, so they read as
// faded backlight rather than as working screens, and the CAPTCHA's own
// reveal — which is the moment the whole scene is built around — still
// arrives as by far the brightest thing the visitor has seen. Colour is
// cold grey per the project's fixed colour roles: warmth in this
// experience belongs to Memories and to the post-failure cue, never here.
//
// Everything is fogged normally. Nothing here is fog-exempt, nothing
// animates, and no plate is placed where it can compete with the
// monument's silhouette (all eight stop by z = -236, well outside the
// CAPTCHA sightline clearing that GraveMarkerField documents).
//
// Cost: one 1024x576 CanvasTexture per memorial, generated once at mount
// and disposed on unmount, plus ~10 boxes each. No external asset, no
// loader, no post-processing.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { groundHeightAt } from "./groundHeight";
import { eraMemorials } from "../../data/graveyardEpitaphs";

// --- Stone -------------------------------------------------------------
// Matched to GraveyardMemorials' solved STONE family rather than invented,
// so an era memorial reads as the same material as the graves around it,
// just more of it. The plate surround is a shade darker so the recess
// reads as a recess.
const STONE = "#5b666b";
const STONE_DARK = "#3d4548";
const PLATE_BACK = "#0b0e10";

// Plate emissive. See the header — this is a hierarchy value, not a
// legibility value.
const PLATE_EMISSIVE = "#aab6bc";
const PLATE_EMISSIVE_INTENSITY = 0.22;

// --- Plate geometry ----------------------------------------------------
// One form for all eight. Variety comes from scale, lean, damage state
// and the broken flag rather than from a second body, which keeps the
// memorials reading as one municipal vocabulary — the same restraint the
// grave kit uses.
const PLINTH = { w: 8.0, h: 0.55, d: 2.8 };
const SLAB = { w: 7.2, h: 4.4, d: 0.75 };
const PLATE = { w: 6.2, h: 3.49 };
const PLATE_Y = 0.42; // above the slab's own centre
const SLAB_TILT = -0.13; // top leans back, like a real angled plaque
const LIP = 0.34; // width of the surround standing proud of the plate

const CANVAS_W = 1024;
const CANVAS_H = 576;

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- Pictograms --------------------------------------------------------
// Original line art only. Each is drawn into a square region of radius r
// around the origin, in the plate's own ink colour. These evoke an era by
// its shape — a barrier, a signed page, a handshake tone — and none of
// them reproduces a real mark belonging to anyone.
const GLYPHS = {
  // A works barrier: trestle with diagonal hazard banding.
  barrier(ctx, r) {
    ctx.lineWidth = r * 0.12;
    ctx.strokeRect(-r * 0.86, -r * 0.34, r * 1.72, r * 0.56);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-r * 0.86, -r * 0.34, r * 1.72, r * 0.56);
    ctx.clip();
    ctx.lineWidth = r * 0.16;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.34 - r * 0.3, r * 0.34);
      ctx.lineTo(i * r * 0.34 + r * 0.3, -r * 0.34);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = r * 0.11;
    for (const dx of [-0.6, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(dx * r, r * 0.22);
      ctx.lineTo(dx * r * 1.3, r * 0.86);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dx * r, r * 0.22);
      ctx.lineTo(dx * r * 0.7, r * 0.86);
      ctx.stroke();
    }
  },
  // An open book with a ruled page and one signature stroke.
  book(ctx, r) {
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5);
    ctx.lineTo(0, r * 0.62);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.quadraticCurveTo(s * r * 0.5, -r * 0.68, s * r * 0.92, -r * 0.42);
      ctx.lineTo(s * r * 0.92, r * 0.5);
      ctx.quadraticCurveTo(s * r * 0.5, r * 0.32, 0, r * 0.62);
      ctx.stroke();
    }
    ctx.lineWidth = r * 0.07;
    for (let i = 0; i < 3; i++) {
      const y = -r * 0.24 + i * r * 0.22;
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, y);
      ctx.lineTo(-r * 0.18, y);
      ctx.stroke();
    }
    // the one line somebody actually left
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, r * 0.1);
    ctx.bezierCurveTo(r * 0.42, -r * 0.16, r * 0.5, r * 0.3, r * 0.76, -r * 0.02);
    ctx.stroke();
  },
  // A handshake tone: stepped carrier bursts inside a modem panel.
  modem(ctx, r) {
    ctx.lineWidth = r * 0.1;
    ctx.strokeRect(-r * 0.92, -r * 0.56, r * 1.84, r * 1.12);
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    const pts = [
      [-0.74, 0], [-0.58, 0], [-0.5, -0.3], [-0.42, 0.3], [-0.34, 0],
      [-0.1, 0], [-0.02, -0.34], [0.06, 0.34], [0.14, 0],
      [0.34, 0], [0.42, -0.18], [0.5, 0.18], [0.58, 0], [0.74, 0],
    ];
    ctx.moveTo(pts[0][0] * r, pts[0][1] * r);
    for (const [px, py] of pts.slice(1)) ctx.lineTo(px * r, py * r);
    ctx.stroke();
  },
  // A homepage: a small page with a folded corner and a heading rule.
  page(ctx, r) {
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.82);
    ctx.lineTo(r * 0.28, -r * 0.82);
    ctx.lineTo(r * 0.62, -r * 0.46);
    ctx.lineTo(r * 0.62, r * 0.82);
    ctx.lineTo(-r * 0.6, r * 0.82);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.28, -r * 0.82);
    ctx.lineTo(r * 0.28, -r * 0.46);
    ctx.lineTo(r * 0.62, -r * 0.46);
    ctx.stroke();
    ctx.lineWidth = r * 0.13;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.36);
    ctx.lineTo(r * 0.16, -r * 0.36);
    ctx.stroke();
    ctx.lineWidth = r * 0.07;
    for (let i = 0; i < 4; i++) {
      const y = -r * 0.08 + i * r * 0.22;
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, y);
      ctx.lineTo(r * (i === 3 ? 0.06 : 0.44), y);
      ctx.stroke();
    }
  },
  // A play control in a rounded frame.
  play(ctx, r) {
    ctx.lineWidth = r * 0.1;
    const w = r * 0.86;
    const k = r * 0.24;
    ctx.beginPath();
    ctx.moveTo(-w + k, -w * 0.82);
    ctx.lineTo(w - k, -w * 0.82);
    ctx.quadraticCurveTo(w, -w * 0.82, w, -w * 0.82 + k);
    ctx.lineTo(w, w * 0.82 - k);
    ctx.quadraticCurveTo(w, w * 0.82, w - k, w * 0.82);
    ctx.lineTo(-w + k, w * 0.82);
    ctx.quadraticCurveTo(-w, w * 0.82, -w, w * 0.82 - k);
    ctx.lineTo(-w, -w * 0.82 + k);
    ctx.quadraticCurveTo(-w, -w * 0.82, -w + k, -w * 0.82);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.4);
    ctx.lineTo(r * 0.42, 0);
    ctx.lineTo(-r * 0.2, r * 0.4);
    ctx.closePath();
    ctx.fill();
  },
  // A forum signature: a rule, then the four lines under everything.
  signature(ctx, r) {
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 2; i++) {
      const y = -r * 0.74 + i * r * 0.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.86, y);
      ctx.lineTo(r * (i === 1 ? 0.4 : 0.86), y);
      ctx.stroke();
    }
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.24);
    ctx.lineTo(r * 0.86, -r * 0.24);
    ctx.stroke();
    ctx.lineWidth = r * 0.075;
    const widths = [0.72, 0.9, 0.56, 0.8];
    for (let i = 0; i < 4; i++) {
      const y = r * (0.04 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(-r * 0.86, y);
      ctx.lineTo(-r * 0.86 + r * 1.72 * widths[i], y);
      ctx.stroke();
    }
  },
  // A four-panel strip with one badly drawn face.
  panels(ctx, r) {
    ctx.lineWidth = r * 0.08;
    for (const [cx, cy] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
      ctx.strokeRect(cx * r - r * 0.4, cy * r - r * 0.4, r * 0.8, r * 0.8);
    }
    // the face, deliberately crude
    ctx.lineWidth = r * 0.075;
    const fx = 0.45 * r;
    const fy = 0.45 * r;
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx - r * 0.14, fy - r * 0.09);
    ctx.lineTo(fx - r * 0.02, fy - r * 0.03);
    ctx.moveTo(fx + r * 0.14, fy - r * 0.09);
    ctx.lineTo(fx + r * 0.02, fy - r * 0.03);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx - r * 0.14, fy + r * 0.14);
    ctx.quadraticCurveTo(fx, fy + r * 0.02, fx + r * 0.14, fy + r * 0.14);
    ctx.stroke();
  },
  // One envelope, and the copies of it going out behind.
  envelope(ctx, r) {
    ctx.lineWidth = r * 0.075;
    for (const [dx, dy] of [[0.28, -0.24], [0.14, -0.12]]) {
      ctx.strokeRect(-r * 0.62 + dx * r, -r * 0.42 + dy * r, r * 1.24, r * 0.84);
    }
    ctx.lineWidth = r * 0.1;
    ctx.strokeRect(-r * 0.62, -r * 0.42, r * 1.24, r * 0.84);
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.42);
    ctx.lineTo(0, r * 0.12);
    ctx.lineTo(r * 0.62, -r * 0.42);
    ctx.stroke();
  },
};

// --- Plate texture -----------------------------------------------------
// Faded archival, not an interface: ink on a dark plate, one hairline
// rule, and damage knocked back out of the ink so the plate reads as
// something that survived rather than something printed.
const INK_TITLE = "#c9d3d6";
const INK_RULE = "#47545a";
const INK_ERA = "#98a4aa";
const INK_EPITAPH = "#727e84";

// How much of the plate is gone, by state. `lost` deliberately takes the
// subtext with it and leaves the name.
const DAMAGE = {
  intact: { bands: 6, subtext: 1, title: 1, wipe: 0 },
  faded: { bands: 16, subtext: 0.4, title: 0.86, wipe: 0 },
  lost: { bands: 30, subtext: 0.08, title: 0.58, wipe: 1 },
};

function drawPlate(ctx, memorial) {
  const damage = DAMAGE[memorial.state] ?? DAMAGE.intact;
  const rand = mulberry32(hashSeed(memorial.id));

  ctx.fillStyle = PLATE_BACK;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Very faint horizontal grain. Not scanlines — the plate is metal, not
  // a screen; this is the tooth that stops a flat fill reading as a hole.
  for (let y = 0; y < CANVAS_H; y += 3) {
    ctx.fillStyle = `rgba(150,168,176,${0.008 + rand() * 0.012})`;
    ctx.fillRect(0, y, CANVAS_W, 1);
  }

  ctx.strokeStyle = "#283236";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, CANVAS_W - 40, CANVAS_H - 40);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Pictogram
  const glyph = GLYPHS[memorial.glyph];
  if (glyph) {
    ctx.save();
    ctx.translate(CANVAS_W / 2, 112);
    ctx.strokeStyle = INK_ERA;
    ctx.fillStyle = INK_ERA;
    ctx.globalAlpha = damage.title;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    glyph(ctx, 52);
    ctx.restore();
  }

  // Title. Sized so the LONGEST line fits, then both lines use it, which
  // keeps a two-line name looking like one carved block.
  ctx.globalAlpha = damage.title;
  ctx.fillStyle = INK_TITLE;
  const lines = memorial.lines;
  const maxWidth = CANVAS_W - 150;
  let size = 132;
  const widest = () => {
    ctx.font = `bold ${size}px 'Courier New', monospace`;
    return Math.max(...lines.map((l) => ctx.measureText(l).width));
  };
  while (size > 52 && widest() > maxWidth) size -= 3;
  ctx.font = `bold ${size}px 'Courier New', monospace`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${Math.round(size * 0.05)}px`;
  const titleY = lines.length > 1 ? 232 : 262;
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, titleY + i * size * 0.98);
  });
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  const baseY = lines.length > 1 ? 232 + size * 0.98 : 262;

  // Hairline rule
  ctx.globalAlpha = damage.subtext;
  ctx.strokeStyle = INK_RULE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(280, baseY + 88);
  ctx.lineTo(CANVAS_W - 280, baseY + 88);
  ctx.stroke();

  ctx.fillStyle = INK_ERA;
  ctx.font = "78px 'Courier New', monospace";
  ctx.fillText(memorial.era, CANVAS_W / 2, baseY + 150);

  ctx.fillStyle = INK_EPITAPH;
  ctx.font = "62px 'Courier New', monospace";
  ctx.fillText(memorial.epitaph, CANVAS_W / 2, baseY + 228);
  ctx.globalAlpha = 1;

  // Damage last, so it eats ink rather than sitting on top of it. Same
  // destination-out technique the hero graves and the 404 slab use.
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < damage.bands; i++) {
    const y = rand() * CANVAS_H;
    const h = 2 + rand() * 11;
    const x = rand() < 0.55 ? 0 : rand() * CANVAS_W * 0.5;
    const w = CANVAS_W - x * (rand() < 0.5 ? 1.4 : 0.3);
    ctx.fillStyle = `rgba(0,0,0,${0.5 + rand() * 0.45})`;
    ctx.fillRect(x, y, w, h);
  }
  // A couple of corrosion blooms, so the damage is not only linear.
  for (let i = 0; i < 3; i++) {
    const cx = rand() * CANVAS_W;
    const cy = rand() * CANVAS_H;
    const rr = 18 + rand() * 46;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, `rgba(0,0,0,${0.35 + rand() * 0.4})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  // `lost` additionally takes a whole region of the plate with it, so the
  // damage is a shape and not just a texture: from any distance the plate
  // reads as partly gone rather than as evenly dirty.
  if (damage.wipe) {
    const cx = CANVAS_W * (0.18 + rand() * 0.64);
    const cy = CANVAS_H * (0.2 + rand() * 0.6);
    const rr = 190 + rand() * 130;
    const g = ctx.createRadialGradient(cx, cy, rr * 0.15, cx, cy, rr);
    g.addColorStop(0, "rgba(0,0,0,0.95)");
    g.addColorStop(0.65, "rgba(0,0,0,0.6)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function usePlateTextures() {
  const textures = useMemo(() => {
    const map = {};
    for (const memorial of eraMemorials) {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      drawPlate(canvas.getContext("2d"), memorial);
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      map[memorial.id] = t;
    }
    return map;
  }, []);

  useEffect(
    () => () => {
      for (const t of Object.values(textures)) t.dispose();
    },
    [textures],
  );

  return textures;
}

// The surround: four lips standing proud of the plate so it reads as set
// INTO the stone. Without these the plate is a sticker on a box, which is
// the exact "modern billboard" read this pass has to avoid.
function PlateSurround() {
  const halfW = PLATE.w / 2 + LIP / 2;
  const halfH = PLATE.h / 2 + LIP / 2;
  const z = SLAB.d / 2 + 0.055;
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[s * halfW, PLATE_Y, z]}>
          <boxGeometry args={[LIP, PLATE.h + LIP * 2, 0.16]} />
          <meshStandardMaterial color={STONE_DARK} roughness={0.95} metalness={0.03} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, PLATE_Y + s * halfH, z]}>
          <boxGeometry args={[PLATE.w + LIP * 2, LIP, 0.16]} />
          <meshStandardMaterial color={STONE_DARK} roughness={0.95} metalness={0.03} />
        </mesh>
      ))}
    </>
  );
}

function EraMemorial({ memorial, map }) {
  const [x, z] = memorial.position;
  const y = groundHeightAt(x, z) - 0.22;
  const [leanX, leanZ] = memorial.lean;

  return (
    <group position={[x, y, z]} rotation={[0, memorial.yaw, 0]} scale={memorial.scale}>
      <group rotation={[leanX, 0, leanZ]}>
        {/* Foundation */}
        <mesh position={[0, PLINTH.h / 2, 0]}>
          <boxGeometry args={[PLINTH.w, PLINTH.h, PLINTH.d]} />
          <meshStandardMaterial color={STONE_DARK} roughness={0.97} metalness={0.02} />
        </mesh>

        {/* The standing slab, tipped back the way a plaque is */}
        <group position={[0, PLINTH.h + SLAB.h / 2, 0]} rotation={[SLAB_TILT, 0, 0]}>
          <mesh>
            <boxGeometry args={[SLAB.w, SLAB.h, SLAB.d]} />
            <meshStandardMaterial color={STONE} roughness={0.95} metalness={0.03} />
          </mesh>

          <PlateSurround />

          {/* The plate itself, sitting just inside the surround */}
          <mesh position={[0, PLATE_Y, SLAB.d / 2 + 0.012]}>
            <planeGeometry args={[PLATE.w, PLATE.h]} />
            <meshStandardMaterial
              map={map}
              emissiveMap={map}
              emissive={PLATE_EMISSIVE}
              emissiveIntensity={PLATE_EMISSIVE_INTENSITY}
              color={PLATE_BACK}
              roughness={0.5}
              metalness={0.08}
            />
          </mesh>
        </group>

        {/* Broken memorials shed a corner of their own slab, which lies
            where it fell. Changes the silhouette rather than only the
            texture — a perfect box with a damaged plate on it still reads
            as intact from any distance. */}
        {memorial.broken && (
          <>
            <mesh position={[SLAB.w * 0.34, 0.72, PLINTH.d * 0.52]} rotation={[0.42, -0.34, 1.28]}>
              <boxGeometry args={[SLAB.w * 0.34, SLAB.h * 0.3, SLAB.d * 0.9]} />
              <meshStandardMaterial color={STONE} roughness={0.96} metalness={0.03} />
            </mesh>
            <mesh position={[-SLAB.w * 0.46, 0.42, PLINTH.d * 0.4]} rotation={[0.2, 0.5, 0.7]}>
              <boxGeometry args={[1.1, 0.7, 0.9]} />
              <meshStandardMaterial color={STONE_DARK} roughness={1} metalness={0.02} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

export default function GraveyardEpitaphs() {
  const textures = usePlateTextures();

  return (
    <group>
      {eraMemorials.map((memorial) => (
        <EraMemorial key={memorial.id} memorial={memorial} map={textures[memorial.id]} />
      ))}
    </group>
  );
}
