// src/scenes/Graveyard/GraveyardMemorials.jsx
//
// The cemetery itself. This is where the Graveyard stops being a mostly
// empty aftermath and becomes what its name says. Feed is what the
// internet sounded like; this is what it forgot. Two layers, for the same
// reason Feed splits primary fragments from ghost traces:
//
//   * heroMemorials (src/data/graveyardRelics.js) — twelve individually
//     authored, individually recognizable graves. Each is a small
//     original engraving (symbol + name + date) on one of four marker
//     bodies. These carry the film's few deliberate laughs ("wait... is
//     that the bottle flip?") and are rendered as ordinary meshes because
//     there are only twelve of them.
//   * FillerGraves — a much larger anonymous field established through
//     two InstancedMesh archetypes plus a mound InstancedMesh,
//     deterministically seeded so the layout never shifts across
//     renders. These carry no text and no per-instance identity.
//
// Two passes were needed before this read as a graveyard at all, and a
// third pass (this one) was needed before it read as one AT NORMAL
// VIEWING SIZE rather than in an isolated close-up screenshot:
//
//   1. Scale and material. The archetype bodies were originally authored
//      close to literal tombstone size (2-3 units) next to towers 9-20
//      units tall, and their stone colour was DARKER than the ground's
//      own albedo — in a near-black scene lit only by a dim hemisphere
//      term and a grazing key, an object that is small AND no lighter
//      than the ground it stands on doesn't read as a badly-lit grave, it
//      doesn't read at all. Fixed by sizing bodies against the
//      infrastructure they stand among and giving every stone surface a
//      shade of cold graphite/concrete lighter than GraveyardArchitecture's
//      GROUND_STONE.
//   2. Camera-aware placement. GraveyardCamera always looks down its OWN
//      forward heading, never sideways at whatever is level with it — a
//      grave standing beside the camera's CURRENT position sits at
//      roughly 90 degrees off the view axis at that exact moment, behind
//      the frustum, not in it. What determines whether a grave reads as a
//      large, close shape is the closest approach the camera makes to it
//      WHILE it is still inside the forward viewing cone, which happens
//      while the camera is still some distance before that z. Hero
//      positions in graveyardRelics.js are solved against a numeric
//      simulation of the camera's exact math for exactly this.
//   3. LAYOUT, not just visibility. Fixing (1) and (2) made individual
//      graves legible in isolation, but the filler field was still a
//      rejection-sampled scatter across a full +-130 unit half-width —
//      the overwhelming majority of those points landed 40-130 units off
//      the path, i.e. outside any distance at which (1) and (2) matter at
//      all, so the aggregate STILL read as empty terrain with a handful
//      of legible props rather than as a graveyard. The filler field
//      below is now a ROW GENERATOR: fixed lateral bands (ROW_BANDS) on
//      both sides of the route, each running the length of a burial
//      SECTION with regular-ish spacing, jittered and occasionally
//      skipped so the rows read as weathered rather than a parade
//      ground. Row-band offsets were chosen from the same camera
//      simulation as (2): the near band (~9 units off centre) stays
//      legible at 16-23 units of camera distance almost everywhere on
//      the route, the mid band (~18-20) recedes to a genuine second rank
//      at 34-48 units, and the far band (~31-35) is the one meant to
//      dissolve into fog at 60-80 units. The GAPS between bands are the
//      walkways — negative space in offset-space, which by construction
//      can never read as a corridor pointing at the CAPTCHA, because a
//      lateral gap and a forward runway are different axes entirely.
//
// Both layers use groundHeightAt for placement and settle slightly below
// it (mounds, sunk bases) rather than balancing on y = 0, which is the
// difference between "planted in dead ground" and "floating over a dark
// plane" at distance.
//
// Hero positions were then snapped onto the SAME row bands the filler
// field uses (see graveyardRelics.js), so a hero grave sits IN a row
// instead of floating between the anonymous field's bands at its own
// bespoke offset. Each hero's engraved face is turned toward the route by
// computed yaw rather than an authored angle (see facingYaw below).

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { groundHeightAt, routeXAt } from "./groundHeight";
import { heroMemorials } from "../../data/graveyardRelics";
// TEMPORARY — GLB visual-isolation pass. While this flag is true the
// anonymous FillerGraves field below is hidden so the authored Blender
// kit can be inspected in isolation. Hero memorials stay. Revert by
// setting DEBUG_ISOLATE_GLB_MARKERS back to false in GraveMarkerField.jsx
// and deleting this import + the guard in GraveyardMemorials() below.
import { DEBUG_ISOLATE_GLB_MARKERS } from "./GraveMarkerField";

// Deliberately LIGHTER than the ground's own albedo (GROUND_STONE,
// #343b3e in GraveyardArchitecture.jsx) rather than reusing the relics'
// darker METAL_DARK family. A first pass matched the relics' tone and the
// graves vanished — in a near-black scene lit only by a dim hemisphere
// term and a grazing key, a stone that is the SAME value as the ground or
// darker has no silhouette to read at all, whatever its geometry. Cold
// graphite/concrete a shade lighter than the earth it sits in is what
// actually lets a grave separate from the ground plane instead of
// dissolving into it. Still restrained, still no emissive glow — the
// lift is entirely in base colour.
// Pushed a further step lighter in the layout pass: even with correct
// scale and placement, the first value here read as near-black in
// practice because so little light reaches these surfaces (dim
// hemisphere term plus one distant grazing key). This is still cold,
// desaturated graphite/concrete — no warmth, no glow — just enough
// headroom above the ground's own #343b3e that an edge exists for the
// grazing key to catch even at oblique angles.
const STONE_A = "#606c70";
const STONE_B = "#525c60";
const STONE_DARK = "#3f484c";
const EARTH = "#1a1f21";

// Same seeded PRNG used throughout the project (Prelude, Feed) for
// deterministic layout that never changes across re-renders.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap string hash for per-grave deterministic jitter (mound offset,
// weathering band count) that doesn't need its own PRNG instance.
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- Hero engravings ---------------------------------------------------
// Original line-art only: silhouette and gesture, never a reproduction of
// a real photo, logo or screenshot. Each symbol is drawn into a small
// square-ish region around the origin at roughly the scale of `r`.

const SYMBOLS = {
  plank(ctx, r) {
    ctx.fillRect(-r * 0.7, r * 0.15, r * 0.22, r * 0.32);
    ctx.fillRect(r * 0.48, r * 0.15, r * 0.22, r * 0.32);
    ctx.save();
    ctx.rotate(-0.05);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, r * 0.06);
    ctx.lineTo(r * 0.92, -r * 0.04);
    ctx.stroke();
    ctx.restore();
  },
  loop(ctx, r) {
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, -Math.PI * 0.15, Math.PI * 1.55);
    ctx.stroke();
    const a = -Math.PI * 0.15;
    const px = Math.cos(a) * r * 0.6;
    const py = Math.sin(a) * r * 0.6;
    ctx.beginPath();
    ctx.moveTo(px - r * 0.08, py - r * 0.15);
    ctx.lineTo(px + r * 0.18, py);
    ctx.lineTo(px - r * 0.08, py + r * 0.15);
    ctx.closePath();
    ctx.fill();
  },
  fragments(ctx, r) {
    const parts = [
      [-0.5, -0.28, 0.5],
      [0.4, -0.12, -0.35],
      [-0.08, 0.35, 1.1],
      [0.55, 0.3, -0.85],
    ];
    for (const [dx, dy, rot] of parts) {
      ctx.save();
      ctx.translate(dx * r, dy * r);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.22, r * 0.13, r * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-r * 0.09, -r * 0.05, r * 0.18, r * 0.3);
      ctx.restore();
    }
  },
  bucket(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, -r * 0.5);
    ctx.lineTo(r * 0.38, -r * 0.5);
    ctx.lineTo(r * 0.28, r * 0.42);
    ctx.lineTo(-r * 0.28, r * 0.42);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 0.28, Math.PI, 0);
    ctx.stroke();
    for (const dx of [-0.15, 0.05, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(dx * r, r * 0.42);
      ctx.lineTo(dx * r, r * 0.42 + r * (0.18 + Math.abs(dx) * 0.3));
      ctx.stroke();
    }
  },
  dress(ctx, r) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(-r * 0.22, -r * 0.55);
    ctx.lineTo(-r * 0.4, r * 0.55);
    ctx.lineTo(0, r * 0.55);
    ctx.closePath();
    ctx.fillStyle = "#3d4a52";
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(r * 0.22, -r * 0.55);
    ctx.lineTo(r * 0.4, r * 0.55);
    ctx.lineTo(0, r * 0.55);
    ctx.closePath();
    ctx.fillStyle = "#4a4636";
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.55);
    ctx.lineTo(-r * 0.08, -r * 0.74);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.12, -r * 0.55);
    ctx.lineTo(r * 0.08, -r * 0.74);
    ctx.stroke();
  },
  bottle(ctx, r) {
    ctx.save();
    ctx.rotate(0.5);
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.62);
    ctx.lineTo(r * 0.12, -r * 0.62);
    ctx.lineTo(r * 0.12, -r * 0.38);
    ctx.lineTo(r * 0.26, -r * 0.15);
    ctx.lineTo(r * 0.26, r * 0.55);
    ctx.lineTo(-r * 0.26, r * 0.55);
    ctx.lineTo(-r * 0.26, -r * 0.15);
    ctx.lineTo(-r * 0.12, -r * 0.38);
    ctx.closePath();
    ctx.stroke();
    ctx.fillRect(-r * 0.14, -r * 0.72, r * 0.28, r * 0.1);
    ctx.restore();
  },
  frozen(ctx, r) {
    const xs = [-0.4, 0, 0.4];
    const rots = [0.05, -0.04, 0.08];
    xs.forEach((dx, i) => {
      ctx.save();
      ctx.translate(dx * r, 0);
      ctx.rotate(rots[i]);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.42, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-r * 0.08, -r * 0.28, r * 0.16, r * 0.62);
      ctx.restore();
    });
  },
  spinner(ctx, r) {
    ctx.lineWidth = r * 0.1;
    const R = r * 0.42;
    const pts = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => [
      Math.cos(a - Math.PI / 2) * R,
      Math.sin(a - Math.PI / 2) * R,
    ]);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    for (const [x, y] of pts) {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.17, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  },
  waveform(ctx, r) {
    const heights = [0.3, 0.7, 0.45, 0.9, 0.55, 0.8, 0.35, 0.65, 0.5, 0.25];
    const bw = ((r * 1.5) / heights.length) * 0.6;
    const gap = ((r * 1.5) / heights.length) * 0.4;
    const totalW = heights.length * (bw + gap) - gap;
    let x = -totalW / 2;
    for (const h of heights) {
      const bh = h * r * 0.9;
      ctx.fillRect(x, -bh / 2, bw, bh);
      x += bw + gap;
    }
  },
  alien(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.bezierCurveTo(r * 0.4, -r * 0.5, r * 0.42, r * 0.05, r * 0.22, r * 0.32);
    ctx.bezierCurveTo(r * 0.1, r * 0.45, -r * 0.1, r * 0.45, -r * 0.22, r * 0.32);
    ctx.bezierCurveTo(-r * 0.42, r * 0.05, -r * 0.4, -r * 0.5, 0, -r * 0.55);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-r * 0.14, -r * 0.02, r * 0.14, r * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.14, -r * 0.02, r * 0.14, r * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, r * 0.62);
    ctx.lineTo(r * 0.6, r * 0.62);
    ctx.stroke();
  },
  bean(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.5);
    ctx.lineTo(-r * 0.3, -r * 0.15);
    ctx.arc(0, -r * 0.15, r * 0.3, Math.PI, 0);
    ctx.lineTo(r * 0.3, r * 0.5);
    ctx.arc(0, r * 0.5, r * 0.3, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.fillStyle = "#0a0c0d";
    ctx.beginPath();
    ctx.ellipse(r * 0.12, -r * 0.22, r * 0.22, r * 0.14, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  grid(ctx, r) {
    const cols = 5;
    const rows = 3;
    const cell = r * 0.28;
    const gap = r * 0.06;
    const totalW = cols * cell + (cols - 1) * gap;
    const totalH = rows * cell + (rows - 1) * gap;
    const startX = -totalW / 2;
    const startY = -totalH / 2;
    const filled = [
      [0, 0],
      [2, 0],
      [1, 1],
      [3, 1],
      [4, 1],
      [0, 2],
      [2, 2],
      [4, 2],
    ];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (cell + gap);
        const y = startY + row * (cell + gap);
        const isFilled = filled.some(([c, rr]) => c === col && rr === row);
        if (isFilled) ctx.fillRect(x, y, cell, cell);
        else ctx.strokeRect(x, y, cell, cell);
      }
    }
  },
};

const CANVAS_W = 400;
const CANVAS_H = 460;

// Fits `text` at the largest size that clears `maxWidth`, falling back to
// a two-line split at the space nearest the middle and shrinking further
// if needed. Generic rather than per-label, since a couple of hero names
// ("ICE BUCKET CHALLENGE") are meaningfully longer than the rest.
function fitAndDrawLabel(ctx, text, cx, cy, maxWidth) {
  const fitsSingle = (size) => {
    ctx.font = `bold ${size}px 'Courier New', monospace`;
    return ctx.measureText(text).width <= maxWidth;
  };
  let size = 34;
  while (size > 20 && !fitsSingle(size)) size -= 2;
  if (fitsSingle(size)) {
    ctx.font = `bold ${size}px 'Courier New', monospace`;
    ctx.fillText(text, cx, cy);
    return;
  }

  let splitAt = -1;
  let bestDist = Infinity;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      const dist = Math.abs(i - text.length / 2);
      if (dist < bestDist) {
        bestDist = dist;
        splitAt = i;
      }
    }
  }
  const line1 = splitAt >= 0 ? text.slice(0, splitAt) : text;
  const line2 = splitAt >= 0 ? text.slice(splitAt + 1) : "";

  size = 28;
  const fitsSplit = (s) => {
    ctx.font = `bold ${s}px 'Courier New', monospace`;
    return Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) <= maxWidth;
  };
  while (size > 16 && !fitsSplit(size)) size -= 2;
  ctx.font = `bold ${size}px 'Courier New', monospace`;
  ctx.fillText(line1, cx, cy - size * 0.62);
  if (line2) ctx.fillText(line2, cx, cy + size * 0.62);
}

// Irregular dead bands knocked out of the paint, same technique as the
// 404 slab and the CAPTCHA's own display — a surface that survived rather
// than one that was printed clean. Seeded per grave so the damage pattern
// doesn't repeat identically across all twelve.
function drawWeathering(ctx, seed) {
  const rand = mulberry32(seed);
  ctx.globalCompositeOperation = "destination-out";
  const bandCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < bandCount; i++) {
    const y = rand() * CANVAS_H;
    const h = 3 + rand() * 9;
    ctx.fillStyle = `rgba(0,0,0,${0.55 + rand() * 0.35})`;
    ctx.fillRect(0, y, CANVAS_W, h);
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawEngraving(ctx, memorial) {
  ctx.fillStyle = "#0a0c0d";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const drawSymbol = SYMBOLS[memorial.symbol];
  if (drawSymbol) {
    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H * 0.36);
    ctx.strokeStyle = "#5c6669";
    ctx.fillStyle = "#4b5457";
    ctx.lineWidth = 5;
    drawSymbol(ctx, 108);
    ctx.restore();
  }

  ctx.strokeStyle = "#262c2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, CANVAS_H * 0.62);
  ctx.lineTo(CANVAS_W - 56, CANVAS_H * 0.62);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7d8a8d";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  fitAndDrawLabel(ctx, memorial.label, CANVAS_W / 2, CANVAS_H * 0.73, CANVAS_W - 80);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  ctx.font = "20px 'Courier New', monospace";
  ctx.fillStyle = "#495154";
  ctx.fillText(memorial.year, CANVAS_W / 2, CANVAS_H * 0.87);

  drawWeathering(ctx, hashSeed(memorial.id));
}

// Painted before the texture is constructed from it, same as the CAPTCHA
// and the 404 slab — never a `needsUpdate` mutation of a hook's return
// value. Twelve textures total, each disposed on unmount.
function useEngravingTexture(memorial) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    drawEngraving(canvas.getContext("2d"), memorial);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [memorial]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// --- Marker bodies -------------------------------------------------
// Four archetypes, all built from the same box/cylinder language the
// towers and racks already use — brutalist and infrastructural, not
// gothic. Emissive intensity is deliberately tiny: these are unpowered
// stone, legible only because the grazing key and hemisphere light reach
// them, unlike the CAPTCHA's own lit interface.

function EngravedPanel({ map, width, height, y, z, tilt = 0 }) {
  return (
    <mesh position={[0, y, z]} rotation={[tilt, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={map}
        emissiveMap={map}
        emissive="#828d90"
        emissiveIntensity={0.05}
        color="#0d1011"
        roughness={0.82}
        metalness={0.04}
      />
    </mesh>
  );
}

// Sized against the towers and racks these graves actually stand among
// (RelayTower 9-20 tall, ServerRack ~6 tall in GraveyardArchitecture.jsx
// / GraveyardRelics.jsx) rather than at a literal human tombstone scale —
// the first pass used roughly half these dimensions and every grave read
// as a pebble of debris next to that infrastructure. These are still the
// smallest built forms in the scene, just no longer smaller than the
// visitor can register at normal viewing distance.
const TABLET = { w: 3.3, h: 3.1, d: 0.85 };
function TabletMarker({ map }) {
  return (
    <group>
      <mesh position={[0, TABLET.h / 2, 0]}>
        <boxGeometry args={[TABLET.w, TABLET.h, TABLET.d]} />
        <meshStandardMaterial color={STONE_A} roughness={0.93} metalness={0.05} />
      </mesh>
      {/* Weathered bevel standing in for a worn top edge. */}
      <mesh position={[0, TABLET.h - 0.08, 0.03]} rotation={[-0.14, 0, 0]}>
        <boxGeometry args={[TABLET.w, 0.34, TABLET.d * 0.94]} />
        <meshStandardMaterial color={STONE_B} roughness={0.95} metalness={0.03} />
      </mesh>
      <EngravedPanel map={map} width={2.2} height={1.85} y={TABLET.h * 0.5} z={TABLET.d / 2 + 0.03} />
    </group>
  );
}

const ROUND = { w: 2.7, bodyH: 2.35, capR: 1.4 };
function RoundMarker({ map }) {
  return (
    <group>
      <mesh position={[0, ROUND.bodyH / 2, 0]}>
        <boxGeometry args={[ROUND.w, ROUND.bodyH, 0.8]} />
        <meshStandardMaterial color={STONE_B} roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Flattened dome cap — the "soft-topped" silhouette, built from a
          hemisphere rather than an ornate curved profile. */}
      <mesh position={[0, ROUND.bodyH, 0]} scale={[1, 0.55, 0.62]}>
        <sphereGeometry args={[ROUND.capR, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={STONE_B} roughness={0.92} metalness={0.05} />
      </mesh>
      <EngravedPanel map={map} width={1.75} height={1.55} y={ROUND.bodyH * 0.54} z={0.44} />
    </group>
  );
}

// Stepped rather than a true tapered pillar: three stacked boxes, the
// same construction language as ServerRack, so it reads as "short
// obelisk/server-like marker" rather than a cemetery obelisk prop. Also
// the tallest archetype (~5.4 units) — it's the one most likely to break
// the horizon on its own even at moderate distance.
function ObeliskMarker({ map }) {
  return (
    <group>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[1.9, 2.6, 1.5]} />
        <meshStandardMaterial color={STONE_A} roughness={0.9} metalness={0.06} />
      </mesh>
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[1.3, 1.6, 1.1]} />
        <meshStandardMaterial color={STONE_B} roughness={0.9} metalness={0.06} />
      </mesh>
      <mesh position={[0, 4.65, 0]}>
        <boxGeometry args={[0.8, 0.9, 0.75]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.88} metalness={0.08} />
      </mesh>
      <EngravedPanel map={map} width={1.35} height={1.75} y={1.35} z={0.78} />
    </group>
  );
}

// A marker broken across its own middle, the upper section slid and
// rotated clear of the break — same grammar as the snapped relay towers
// and the CAPTCHA's own collapsed frame, applied at grave scale.
function FracturedMarker({ map }) {
  return (
    <group>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[2.9, 2.1, 0.75]} />
        <meshStandardMaterial color={STONE_A} roughness={0.9} metalness={0.06} />
      </mesh>
      <mesh position={[0.5, 2.35, -0.07]} rotation={[0, 0, -0.22]}>
        <boxGeometry args={[2.5, 1.1, 0.68]} />
        <meshStandardMaterial color={STONE_B} roughness={0.92} metalness={0.05} />
      </mesh>
      <EngravedPanel map={map} width={2.0} height={1.4} y={1.12} z={0.42} />
    </group>
  );
}

const ARCHETYPES = {
  tablet: TabletMarker,
  round: RoundMarker,
  obelisk: ObeliskMarker,
  fractured: FracturedMarker,
};

// How far each archetype's base sits below the sampled ground height —
// the grave "settling" into the terrain rather than resting on it. Kept
// shallow now that the bodies are much taller: sinking a 5-unit obelisk
// by the same fraction as before would bury more of the newly-added
// height than it would ever gain in "grounded" read.
const EMBED_BY_ARCHETYPE = { tablet: 0.1, round: 0.12, obelisk: 0.06, fractured: 0.16 };

// Disturbed earth around a hero grave's base, scaled up to match the
// larger bodies. Offset and rotation come from a hash of the grave's id
// rather than Math.random, so the mound is stable across renders without
// needing its own PRNG instance.
function GraveMound({ seed }) {
  const n = hashSeed(seed);
  const jitter = (n % 100) / 100;
  const rot = ((n >> 3) % 100) / 100;
  return (
    <mesh
      position={[(jitter - 0.5) * 0.7, -0.14, (rot - 0.5) * 0.8]}
      rotation={[0.03, rot * Math.PI, 0.02]}
    >
      <boxGeometry args={[3.4 + jitter * 0.8, 0.34, 2.4 + rot * 0.6]} />
      <meshStandardMaterial color={EARTH} roughness={1} metalness={0} />
    </mesh>
  );
}

// Turns the engraved face toward the route rather than an arbitrary
// hand-picked heading: a plane's unrotated normal is +Z, and rotating a
// group by atan2(dx, 0) around Y points that normal at whatever lateral
// direction the route centreline sits in from this grave — the same way
// a roadside marker faces the road beside it rather than a fixed compass
// bearing. dz is deliberately 0 (aim at the route's point at this same z,
// not one further down it) so the result is a clean, almost-perpendicular
// face-on toward the path, which is also the angle the passing camera
// actually gets the most face-on read from. A few degrees of per-grave
// jitter (hashed from the id) keep a dozen of these from all reading as
// exactly 90 degrees.
function facingYaw(x, z, seed) {
  const dx = routeXAt(z) - x;
  const base = Math.atan2(dx, 0);
  const n = hashSeed(seed);
  const jitter = (((n >> 5) % 100) / 100 - 0.5) * 0.3;
  return base + jitter;
}

function HeroMemorial({ memorial }) {
  const map = useEngravingTexture(memorial);
  const [x, z] = memorial.position;
  const y = groundHeightAt(x, z) - EMBED_BY_ARCHETYPE[memorial.archetype];
  const Body = ARCHETYPES[memorial.archetype];
  const [leanX, leanZ] = memorial.lean;
  const yaw = facingYaw(x, z, memorial.id);

  return (
    <group position={[x, y, z]} rotation={[leanX, yaw, leanZ]} scale={memorial.scale}>
      <GraveMound seed={memorial.id} />
      <Body map={map} />
    </group>
  );
}

function HeroMemorials() {
  return (
    <>
      {heroMemorials.map((memorial) => (
        <HeroMemorial key={memorial.id} memorial={memorial} />
      ))}
    </>
  );
}

// --- Anonymous filler field: an actual row generator ------------------
// A rejection-sampled scatter, then long rows running parallel to the
// route, both failed the normal-viewport read: they made markers feel like
// debris beside a road. The field now builds short, transverse cemetery
// rows. Each row crosses one side of the route from the near plot toward
// the fog, so the repeated z positions and the empty strips between them
// read as graves, walkway, graves rather than as a continuous roadside.
//
// These slots retain the camera-tested 9-35 unit range used by the hero
// memorials: the first two are the immediately legible plots, while the
// outer two soften into the fog. Their uneven gaps create narrow plot
// lanes without turning the burial ground into a perfect grid.
const PLOT_SLOTS = [9.5, 14.5, 21, 27.5, 35.5];

// The gaps between sections are intentional cross-lanes. The centre
// sections tighten into the strongest cemetery read, then the final one
// stops well before the CAPTCHA so its existing reveal remains clear.
const SECTIONS = [
  { z0: 22, z1: -38, spacing: 12, damage: 0.28 },
  { z0: -58, z1: -118, spacing: 9, damage: 0.18 },
  { z0: -140, z1: -214, spacing: 8, damage: 0.14 },
  { z0: -238, z1: -292, spacing: 10, damage: 0.24 },
];

// Existing relic/tower anchors (TOWERS/FALLEN in GraveyardArchitecture.jsx,
// RACKS/FrozenSpinner/SpinnerFragment/NotFoundSlab in GraveyardRelics.jsx,
// CableBundle/BrokenDisplay, and the CAPTCHA's own footprint), each with
// an approximate clearance radius, so rows break around infrastructure
// instead of clipping through it.
const OBSTACLES = [
  { x: -23, z: -12, r: 6 },
  { x: -34, z: -22, r: 6 },
  { x: -46, z: -44, r: 10 },
  { x: -21, z: -30, r: 14 },
  { x: -12, z: -88, r: 8 },
  { x: -11, z: -94, r: 5 },
  { x: -7.4, z: -99, r: 5 },
  { x: -13.6, z: -103, r: 5 },
  { x: -5, z: -106.5, r: 5 },
  { x: -21, z: -122, r: 9 },
  { x: -11.5, z: -116, r: 7 },
  { x: -52, z: -150, r: 11 },
  { x: -4, z: -206, r: 13 },
  { x: 4, z: -188, r: 8 },
  { x: -29, z: -240, r: 8 },
  { x: -31.5, z: -236, r: 8 },
  { x: 62, z: -318, r: 9 },
  { x: -6, z: -332, r: 8 },
  { x: 30, z: -320, r: 40 },
];

function violatesObstacle(x, z) {
  for (const o of OBSTACLES) {
    const dx = x - o.x;
    const dz = z - o.z;
    if (dx * dx + dz * dz < o.r * o.r) return true;
  }
  return false;
}

const HERO_CLEARANCE = 3.5;

function buildGraveRows() {
  const rand = mulberry32(90210);
  const slots = [];

  for (const [sectionIndex, section] of SECTIONS.entries()) {
    let z = section.z0;
    let rowIndex = 0;
    while (z > section.z1) {
      // Most of the drift belongs to the entire row; individual graves only
      // wander a little so the shared alignment remains visible at distance.
      const rowZ = z + (rand() - 0.5) * 1.8;
      const rowX = routeXAt(rowZ);

      for (const side of [-1, 1]) {
        for (let slotIndex = 0; slotIndex < PLOT_SLOTS.length; slotIndex++) {
          const damaged = rand() < section.damage;
          if (damaged && rand() < 0.62) continue;

          const displaced = damaged;
          const zPos = rowZ + (rand() - 0.5) * 1.1 + (displaced ? (rand() - 0.5) * 4 : 0);
          const xPos =
            rowX +
            side * (PLOT_SLOTS[slotIndex] + (rand() - 0.5) * 0.8 + (displaced ? rand() * 2 : 0));

          if (violatesObstacle(xPos, zPos)) continue;

          let nearHero = false;
          for (const m of heroMemorials) {
            const [hx, hz] = m.position;
            const dx = hx - xPos;
            const dz = hz - zPos;
            if (dx * dx + dz * dz < HERO_CLEARANCE * HERO_CLEARANCE) {
              nearHero = true;
              break;
            }
          }
          if (!nearHero) {
            slots.push({
              x: xPos,
              z: zPos,
              bandIndex: slotIndex,
              id: `${sectionIndex}-${rowIndex}-${side}-${slotIndex}`,
              damaged: displaced,
            });
          }
        }
      }
      z -= section.spacing;
      rowIndex++;
    }
  }

  return slots;
}

function FillerGraves() {
  const boxRef = useRef(null);
  const coneRef = useRef(null);
  const moundRef = useRef(null);

  const { boxMatrices, coneMatrices, moundMatrices } = useMemo(() => {
    const points = buildGraveRows();
    const rand = mulberry32(4488);
    const dummy = new THREE.Object3D();
    const box = [];
    const cone = [];
    const mound = [];

    for (const p of points) {
      const y = groundHeightAt(p.x, p.z);
      const isBox = rand() < 0.58;
      const broken = p.damaged && rand() < 0.46;
      const lean = (rand() - 0.5) * (broken ? 0.9 : 0.34);
      const leanAxis = rand() * Math.PI * 2;
      const rotY = facingYaw(p.x, p.z, p.id);
      // The near band (0) is scaled a little larger on average than the
      // far band (2) — reinforcing the sense of depth a receding row
      // should have, on top of what perspective already does.
      const bandLift = 1 - p.bandIndex * 0.08;
      let heightScale = (0.62 + rand() * 0.85) * bandLift;
      const widthScale = (0.78 + rand() * 0.45) * bandLift;
      const sink = 0.02 + rand() * 0.14;

      if (broken) heightScale *= 0.38 + rand() * 0.18;

      dummy.position.set(p.x, y - sink, p.z);
      dummy.rotation.set(Math.cos(leanAxis) * lean, rotY, Math.sin(leanAxis) * lean);
      dummy.scale.set(widthScale, heightScale, widthScale);
      dummy.updateMatrix();
      (isBox ? box : cone).push(dummy.matrix.clone());

      if (rand() < 0.4) {
        const mw = 1.3 + rand() * 0.9;
        dummy.position.set(p.x, y - 0.1, p.z);
        dummy.rotation.set(0.02, rand() * Math.PI, 0.02);
        dummy.scale.set(mw, 0.24, mw * 0.75);
        dummy.updateMatrix();
        mound.push(dummy.matrix.clone());
      }
    }

    return { boxMatrices: box, coneMatrices: cone, moundMatrices: mound };
  }, []);

  useLayoutEffect(() => {
    if (boxRef.current) {
      boxMatrices.forEach((m, i) => boxRef.current.setMatrixAt(i, m));
      boxRef.current.instanceMatrix.needsUpdate = true;
    }
    if (coneRef.current) {
      coneMatrices.forEach((m, i) => coneRef.current.setMatrixAt(i, m));
      coneRef.current.instanceMatrix.needsUpdate = true;
    }
    if (moundRef.current) {
      moundMatrices.forEach((m, i) => moundRef.current.setMatrixAt(i, m));
      moundRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [boxMatrices, coneMatrices, moundMatrices]);

  // frustumCulled disabled on all three: instancedMesh's default bounding
  // sphere comes from the base geometry, not the spread-out instances, so
  // a field this wide would risk the exact false-invisible failure FeedDebris
  // documents. Three draw calls total is cheap enough to always draw.
  return (
    <>
      <instancedMesh ref={boxRef} args={[null, null, boxMatrices.length]} frustumCulled={false}>
        <boxGeometry args={[1.5, 2.7, 0.65]} />
        <meshStandardMaterial color={STONE_B} roughness={0.96} metalness={0.04} />
      </instancedMesh>
      <instancedMesh ref={coneRef} args={[null, null, coneMatrices.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.3, 0.65, 2.9, 5]} />
        <meshStandardMaterial color={STONE_A} roughness={0.94} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={moundRef} args={[null, null, moundMatrices.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={EARTH} roughness={1} metalness={0.02} />
      </instancedMesh>
    </>
  );
}

export default function GraveyardMemorials() {
  return (
    <group>
      {/* TEMPORARY: FillerGraves (the anonymous instanced field only) is
          hidden during the GLB visual-isolation pass. Restore by setting
          DEBUG_ISOLATE_GLB_MARKERS to false in GraveMarkerField.jsx. */}
      {!DEBUG_ISOLATE_GLB_MARKERS && <FillerGraves />}
      <HeroMemorials />
    </group>
  );
}
