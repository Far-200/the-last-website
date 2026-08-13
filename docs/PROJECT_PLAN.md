# The Last Website — Project Plan

Repository: `Far-200/the-last-website`
Build window: **August 13 – August 30, 2026** (18 days)
Buffer day: **August 31, 2026**
Hard deadline: **September 1, 2026, 3:30 AM IST** (= Aug 31, 5:00 PM CDT, confirmed against the hackathon listing)

This document is the execution contract for the build. When in doubt, this document wins over memory of past conversations.

---

## 1. Project North Star

**Title:** The Last Website

**Hook:** The internet died. One page remained.

**Thesis:** The internet didn't preserve history. It preserved people.

**One-sentence pitch:** One server survived the death of the internet, containing a corrupted archive of ordinary human life, and the visitor moves through its remaining fragments before the connection finally disappears.

**Primary emotional goal:** The visitor should feel like they trespassed into something private and unfinished, not like they toured an art installation.

**What a judge should remember five minutes later:** The CAPTCHA — a machine still asking a dead world to prove it's human — and the quiet line after the blackout. If those two moments land, the project succeeded regardless of what else got cut.

---

## 2. Design Principles

1. **Every scene answers to the emotional curve first.** Uncertainty → recognition → desolation → intimacy → absence. If an asset doesn't serve its stage, it doesn't ship.
2. **The world is the interface.** No persistent HUD, no nav bar, no floating instructions competing with the fiction.
3. **Guaranteed narrative, optional depth.** A visitor who does nothing but progress still gets the complete story. A visitor who lingers gets more.
4. **Restraint over spectacle.** Bloom, chromatic aberration, and glitch are seasoning, not the dish. If it looks like `npm install cyberpunk`, pull it back.
5. **Ordinary over epic.** Mundane fragments (a dog, a birthday cake, "see you tomorrow") carry more weight here than grand statements. Resist the urge to make anything profound-sounding.
6. **One joke carries the humor budget.** The CAPTCHA is the joke. Everything else is atmosphere, at most a wink.
7. **The thesis is earned, not announced.** Within the interactive experience, it appears exactly once, after `CONNECTION LOST`, never as a preface. (See Section 11 for how documentation and the WebGL fallback relate to this rule.)
8. **Modularity protects the deadline.** Any area must be cuttable or simplifiable without breaking the others.
9. **Audio is a narrative layer, not decoration.** Silence is a designed beat, same as sound.
10. **Boring and shipped beats ambitious and unfinished.** Every schedule decision defaults to the smaller, safer option.

---

## 3. Non-Goals

This project is explicitly **not**:

- A game (no combat, no health, no win/lose states)
- A free-roam explorable world
- A technical showcase of shader complexity
- A meme gallery or nostalgia clip show
- A portfolio site wearing a 3D costume
- A multi-ending branching narrative
- A "collect everything" completionist experience
- A platform requiring accounts, servers, or a backend

---

## 4. Visitor Journey

### Prelude — Connection
- **Emotional purpose:** Uncertainty
- **Landmark:** A single terminal prompt in near-total black
- **Interaction:** Visitor clicks `[ ESTABLISH CONNECTION ]` — this is the Prelude's own required interaction
- **Sound:** No audio plays before this click. The click is the unlock gesture: it starts the audio system, and a faint connecting tone begins.
- **Lighting:** Near-black, one cold dim glyph/cursor light
- **Exit condition:** 2–3 short status lines (searching, failure, "1 NODE RESPONDED"), then a hard cut into the world. Total duration target: ~5 seconds, not counting the click itself.

### Area 1 — The Feed
- **Emotional purpose:** Recognition
- **Landmark:** A broken data-stream corridor — a directional structure implying scale and motion, not a void
- **Interaction:** At least one representative local interaction — approaching/looking at suspended fragments causes them to reconstruct/brighten briefly
- **Sound:** Cold ambient bed, occasional soft data-static texture, a subtle chime on fragment reconstruction
- **Lighting:** Cold, dim but increasingly legible; screen-glow as the only light sources
- **Exit condition:** Visitor continues forward (scroll/wheel/swipe) past a threshold point into Area 2

### Area 2 — The Graveyard
- **Emotional purpose:** Desolation
- **Landmark:** The CAPTCHA monolith — the hero visual of the entire project
- **Interaction:** At least one representative local interaction — visitor can approach the CAPTCHA and other ruin fragments (dead loading spinner, 404 remnants, one buried cookie-consent panel); minimal hover/click responses, no puzzle
- **Sound:** Sparse — faint electrical hum, dead-air quality, near-silence in places; no music bed here, this section should feel emptier than Area 1, not just colder
- **Lighting:** Escalate through scale/contrast/architecture, not just color shift; harsh isolated light on monuments, deep shadow everywhere else
- **Exit condition:** Continued forward progression into Area 3

### Area 3 — Memories
- **Emotional purpose:** Intimacy
- **Landmark:** A constellation/archive structure of suspended memory fragments
- **Interaction:** At least one representative local interaction — approach/hover/click individual memories (photo-like fragments); each reconstructs with a brief warm glow and a soft audio cue (the shared/reused memory reconstruction cue — see Section 8); no counter, no gating
- **Sound:** The warmest sound in the piece — distant, soft, human-adjacent (not literal voices/music that could read as licensed content); this is where the ambient bed should feel least mechanical
- **Lighting:** First real warmth in the experience — amber/gold, used sparingly enough that its arrival is a genuine shift
- **Exit condition:** Continued forward progression toward the final terminal

### Area 4 — The Last Message
- **Emotional purpose:** Absence
- **Landmark:** One isolated surviving server/terminal, alone in dark space
- **Interaction:** Automatic proximity/progression trigger only — no manual interaction is required. Reaching the terminal is sufficient; the finale sequence (Section 4.1 below) plays on its own.
- **Sound:** Ambient bed thins out and drops away as part of the finale sequence.
- **Lighting:** Warmth drains to pale/neutral machine light, then to black.
- **Exit condition:** See the canonical finale sequence below.

### 4.1 Canonical Finale Sequence

This is the single authoritative order for the ending. Sections 8, 13, 14, and 19 all refer back to this list rather than restating their own version.

1. Visitor reaches the final terminal.
2. Minimal terminal status appears (files recovered, users online: 0, network offline).
3. Ambient sound drains toward near-silence.
4. **"See you tomorrow."** appears.
5. A deliberate beat of true silence follows.
6. Terminal-failure cue occurs.
7. Immediate blackout.
8. `CONNECTION LOST` appears against black after a short beat.
9. `CONNECTION LOST` disappears.
10. Another restrained pause.
11. Thesis appears alone: **"The internet didn't preserve history. It preserved people."**
12. Thesis fades.
13. Only then may a subtle restart/credits affordance appear.

Exact millisecond timings are not locked yet; this emotional ordering is.

---

## 5. Technical Architecture

- **React** — app shell, routing between prelude/experience states, UI chrome that lives outside the canvas (connect button, mute control, loading screen)
- **React Three Fiber** — declarative scene composition; each area is a component tree, mountable/unmountable independently
- **Drei** — camera helpers, `useProgress`/loading utilities, text-in-3D, scroll helpers, image/texture abstractions — avoid reinventing plumbing Drei already solves
- **Camera progression system (single source of truth):** continuous, visitor-driven progression owns all continuous camera movement. A normalized 0→1 progression value maps onto fixed, authored camera waypoints/path; camera position and orientation update every frame through R3F frame interpolation/damping driven by that progression value. See Section 7 for the full model.
- **GSAP** — used only for discrete, authored moments where a timeline is genuinely useful: Prelude boot text timing, finale timing (Section 4.1), optional small settle effects at a waypoint once the visitor has stopped there. GSAP never drives or fights the continuous scroll-based camera position — there is exactly one system moving the camera frame-to-frame, and it is the progression system above.
- **Audio layer** — a single custom hook (`useAudioEngine`), introduced on Day 4, wrapping the Web Audio API directly (chosen over Howler for this project — the feature set needed is small enough that a thin custom wrapper avoids an extra dependency). It exposes only: start/unlock, play/change ambience, play cue, fade, mute/unmute, stop/silence. It owns the unlock-on-Connect logic, cross-fades between area ambience, mute state, and silent fallback. Keep the API tiny — do not grow it into a general audio framework.
- **Scene/progression state** — **Zustand**, introduced on Day 2 (not a Day-1 dependency). The store stays small and tracks only genuinely shared experience state: normalized progression (0–1), current area, finale-fired status, and any tiny number of global flags that later prove necessary. It is not a general-purpose state dumping ground.
- **Asset management** — content (fragment text, memory captions, terminal copy) lives in plain data files, not hardcoded inside components, so copy edits don't touch scene code
- **Post-processing** — a single shared post-processing stack (bloom, subtle vignette, restrained chromatic aberration) configured once and toggled/intensity-adjusted per area via props, not five separate pipelines

**Recommended pattern:** progression-driven, config-driven scenes. Each area is defined by a small data object (landmark type, camera waypoints, interactable fragment list, lighting preset, audio cues) consumed by a shared `<Area>`-style component where practical. This keeps individual areas cuttable and keeps Claude/Copilot-generated code from sprawling into five bespoke, inconsistent implementations.

---

## 6. Proposed Repository Structure

```
the-last-website/
├── docs/
│   ├── PROJECT_PLAN.md
│   └── CREDITS.md
├── public/
│   ├── audio/
│   └── favicon, static meta assets
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── ui/              # Connect button, mute toggle, loading screen, HUD-free chrome
│   │   └── layout/
│   ├── scenes/
│   │   ├── Prelude/
│   │   ├── Feed/
│   │   ├── Graveyard/
│   │   ├── Memories/
│   │   └── LastMessage/
│   ├── three/
│   │   ├── elements/        # reusable 3D primitives (fragment card, monolith, terminal, particles)
│   │   ├── camera/          # camera rig, path/waypoint logic
│   │   └── postprocessing/  # shared effect stack
│   ├── audio/
│   │   ├── useAudioEngine.js
│   │   └── cues.js
│   ├── data/
│   │   ├── feedFragments.js
│   │   ├── graveyardRelics.js
│   │   ├── memories.js
│   │   └── terminalCopy.js
│   ├── state/
│   │   └── progressionStore.js   # Zustand store, introduced Day 2
│   ├── hooks/
│   ├── styles/
│   └── assets/
│       ├── models/
│       └── textures/
├── README.md
├── LICENSE
├── package.json
└── vite.config.js
```

`docs/PROJECT_PLAN.md` is the single canonical location for this file — no root-level copy or symlink. This project is developed primarily on Windows, so a filesystem symlink is not required and should not be introduced. `README.md` stays at the repository root. `docs/CREDITS.md` lives under `docs/` and may remain an empty/stub file until the first third-party asset actually enters the project (see Section 20).

No deeper abstraction than this is needed. Resist adding a generic "engine" layer.

---

## 7. Navigation / Camera System

**Chosen approach: scroll/wheel/touch-driven progression along a single authored camera path, with local look/interact freedom at waypoints.**

- **One source of truth:** a single normalized progression value (0 → 1), held in the Zustand store, drives all continuous camera movement. It maps to a position along a fixed, authored camera path built from waypoints — one cluster of waypoints per area. Camera position/orientation is updated every frame via R3F frame interpolation/damping based on this value — not by GSAP. GSAP is reserved for discrete authored moments (Prelude text, finale, optional settle effects) as described in Section 5; it never independently drives or overrides the continuous progression-based camera position.
- Forward input (scroll wheel, swipe, or a simple "continue" affordance on touch) advances progression; there is no backward-locking requirement, but backward movement is not a design priority — build it only if trivial.
- At each area's primary waypoint, the camera settles/eases to a near-static framing. While settled, the visitor can nudge look direction (subtle mouse-parallax or drag-to-look) and hover/click nearby interactable objects via standard R3F pointer events (raycasting is handled by R3F's built-in pointer system, not custom raycasting code).
- There is no map, no free translation, no collision system to build.
- **Mobile/touch degradation:** swipe-to-advance replaces scroll; drag-to-look replaces mouse parallax; interaction targets sized generously for touch; if performance requires it, reduce particle density and post-processing before removing any narrative content.
- **Getting lost is structurally impossible** — the visitor cannot leave the authored path. The only choice is pace, not direction.

---

## 8. Audio Plan

- **Engine:** the Web Audio API, wrapped in the tiny `useAudioEngine` hook described in Section 5. This is a deliberate choice over Howler — the required feature set (unlock, ambience, cues, fades, mute, stop) is small enough that a direct wrapper is the smaller, more reliable option and avoids an extra dependency. Introduced on Day 4.
- **Minimum required for MVP:** one ambient bed that shifts per area (can be one evolving track with per-area parameter changes rather than five separate files), a connection/start cue, one shared/reused interaction cue reused across fragments (including memory reconstruction — see below), a terminal-failure sound, and true silence used deliberately before/after the final line.
- **Optional enhancements (COULD-tier, stretch polish only):** distinct ambient beds per area, unique interaction sound per individual memory fragment, subtle spatial audio tied to object proximity. These remain optional; they are never promoted into required roadmap work, including on Day 13 (see Section 14).
- **Memories area specifically:** the MUST-level requirement is the shared/reused memory reconstruction cue, its integration, and interaction timing. Unique per-memory sound effects stay COULD-tier.
- **Mute/audio default behavior:**
  - No audio plays before the Prelude Connect click.
  - The Connect gesture unlocks and starts audio.
  - Once unlocked, the experience begins **unmuted by default**.
  - The visitor always has a persistent mute/unmute control.
  - If audio fails or is blocked, the experience remains fully usable.
  - Visual progression never waits for successful audio playback.
- **Volume/fades/transitions:** cross-fade between area ambience over ~1–2 seconds at waypoint transitions; no hard cuts except the two intentional ones (into silence before the final line, and the terminal-failure cut to black).
- **Intentional silence:** after "See you tomorrow." and before `CONNECTION LOST`, per the canonical finale sequence in Section 4.1. This is a designed beat — do not fill it with anything.
- **Licensing:** use royalty-free/CC0 ambient beds and self-generated or clearly-licensed SFX only; keep `docs/CREDITS.md` listing every audio source and its license before submission.
- **If audio cannot play** (blocked, unsupported, user declines): experience must still be fully completable and narratively coherent in silence — never gate visuals or progression on audio succeeding.

---

## 9. Asset Strategy

| Asset class | Approach |
|---|---|
| 3D models | Build simple primitives/low-poly custom geometry ourselves; avoid model-hunting unless a specific landmark (e.g. CAPTCHA monolith) benefits from a sourced/generated base mesh |
| Textures | Simple procedural/shader-based materials where possible; sourced CC0 textures only where necessary, credited |
| Fictional posts/messages | Written ourselves — plain data files, no real scraped social content, ever |
| Photographs/memory images | AI-generated or self-made abstract/illustrative imagery depicting generic, non-identifiable human moments — never real people's photos, never copyrighted stock |
| UI relics (404, CAPTCHA, spinners, cookie banner) | Built ourselves as generic/original interpretations of common UI patterns — not copies of any specific real product's actual UI/branding |
| Sound | CC0/royalty-free ambient + self-recorded or synthesized SFX |
| Fonts | One open-license monospace (system text) + one open-license humanist/serif or sans for any warmer text (memories) — self-hosted, no runtime dependency on a font CDN |

**Discipline:** maintain `docs/CREDITS.md` listing every third-party asset, its source, and its license before submission. Nothing goes in the repo without a known license. The stub file may be created just before the first third-party asset enters the project (see Section 20) rather than on Day 1.

---

## 10. Performance Budget

- **Initial load target:** interactive within a few seconds on a typical broadband connection; lazy-load anything not needed for the prelude/Area 1.
- **Models:** keep individual GLBs small (low tens of KB to low single-digit MB); avoid dense scanned/high-poly assets.
- **Textures:** compressed formats where supported (KTX2/Basis if the pipeline allows, otherwise reasonably sized JPG/WebP); cap resolution at what the camera distance actually resolves — no 4K textures on distant background objects.
- **Draw calls/geometry:** favor instancing for repeated elements (fragment cards, particles); avoid unique high-poly geometry per repeated object.
- **Particles:** keep counts modest; particles support atmosphere, they are not the visual centerpiece.
- **Post-processing:** one shared, lightweight effect stack; avoid stacking multiple expensive passes simultaneously.
- **Audio size:** compressed formats (MP3/OGG), reasonable bitrates — this is ambient sound, not a mastered album.
- **Loading strategy:** preload only the prelude + Area 1 assets before interaction; lazy-load subsequent areas during Area 1/2 dwell time.
- **Target frame rate philosophy:** aim for a smooth, consistent experience on mid-range laptops and recent phones; a locked 60fps is not worth sacrificing the visual identity for, but stuttering below ~30fps is a real problem to fix, not polish to defer.
- **Lower-end devices / graceful reduction:** detect low performance (frame timing or a simple device heuristic) and reduce particle density and post-processing intensity first; narrative content and camera path are never reduced.

---

## 11. Accessibility and Graceful Degradation

- **Reduced motion:** respect `prefers-reduced-motion` by softening camera easing and disabling any gratuitous shake/parallax; core progression still works.
- **Keyboard/basic navigation:** ensure the connect button and any UI chrome (mute, restart) are keyboard-reachable and have visible focus states; full 3D scene keyboard navigation is not required.
- **Contrast:** all system/terminal text must remain legible against dark backgrounds regardless of area lighting.
- **Loading/failure states:** a clear loading indicator during initial asset load; a plain-language fallback message if WebGL is unavailable, explaining the site requires a modern browser/WebGL rather than failing silently.
- **Audio controls:** a persistent, simple mute/volume toggle, reachable at all times. See Section 8 for the full unmuted-by-default behavior.
- **Mobile/touch:** swipe-to-advance and drag-to-look as described in Section 7; touch targets sized generously.
- **WebGL failure fallback:** if WebGL context creation fails, show a static fallback screen with the project title, the hook, and a concise technical explanation that the full experience requires WebGL/a modern browser. **Do not display the thesis line in this fallback** — the thesis is earned within the experience (Section 2, principle 7) and appearing here would spoil the ending. README/project documentation may state the thesis normally; that is a separate, non-spoiling context.

---

## 12. Scope Matrix

### MUST (ship even if everything else goes wrong) — the Emergency Submission Floor
- Prelude with click-to-connect and audio unlock
- All four areas present with at least placeholder-quality visuals matching their intended silhouette
- Guided camera progression start to finish, no dead ends
- CAPTCHA monolith as a real, finished asset (this is non-negotiable — it's the hero image)
- At least one representative local interaction in Feed, Graveyard, and Memories; Area 4's automatic proximity trigger satisfies its requirement (see Section 4)
- Terminal finale sequence per Section 4.1: final line, silence, blackout, `CONNECTION LOST`, thesis reveal
- Baseline ambient audio + the two intentional silences; if audio fails, the silent-fallback degradation path (Section 8) satisfies this MUST
- Mute control
- Deployed, publicly accessible production build
- README, credits/licensing, and Devpost submission materials

If the deadline is imminent and all MUST items above are satisfied, **the project is valid to submit** even if SHOULD/COULD polish remains unfinished. Shipping the coherent MUST experience beats missing submission while polishing.

### SHOULD (Target Definition of Done — the intended polished state if schedule permits)
- Distinct ambient bed per area
- Reconstructing/brightening animation on all Feed and Memories fragments
- Full set of Graveyard relics (404, spinner, cookie banner) beyond the CAPTCHA
- Reduced-motion support
- Mobile swipe/touch path fully tuned
- Demo video

This document never implies that the submission deadline should be missed because a SHOULD/COULD-level polish criterion is unfinished. The Target Definition of Done is aspirational; the Emergency Submission Floor above is the actual gate for whether the project may be submitted.

### COULD (stretch polish)
- Unique interaction sound per memory fragment
- Subtle parallax/look freedom tuning at every waypoint
- Additional Feed fragment variety
- Extra ambient sound layers (electrical hum textures, distant texture layers)
- Restart/replay flow polish

### WON'T (explicitly excluded)
- WASD free-roam movement
- Combat or any game-state system
- Inventory or collection counters
- Required completion percentage to reach the ending
- Authentication
- Any backend/database (static hosting only)
- Multiplayer
- Procedurally generated worlds
- Excessive custom shader work without clear narrative payoff
- Major scope additions after Day 14

---

## 13. Vertical Slice

**Milestone:** an ugly but complete end-to-end skeleton, cubes/planes/placeholder text only, proving the entire architecture works before any beautification begins.

**Deliberately ugly/placeholder during this phase:** all geometry (boxes/planes stand in for the corridor, monolith, constellation, terminal), placeholder text instead of final copy, temporary or single-tone lighting, one temporary ambient loop reused everywhere.

**Acceptance checklist:**
- [ ] Project runs locally from a clean install
- [ ] Visitor sees the Connection prelude
- [ ] Visitor can explicitly click to establish the connection
- [ ] That click successfully enables the audio system
- [ ] The main 3D canvas/world loads
- [ ] Visitor can progress through placeholder versions of every major area
- [ ] Camera progression works from beginning to end
- [ ] At least one representative local interaction works in Feed, Graveyard, and Memories; Area 4 reaches its ending via automatic trigger with no manual interaction required
- [ ] Each area has a placeholder spatial landmark (not just a void)
- [ ] Visitor can reach the finale without completing any optional interaction
- [ ] Final placeholder terminal sequence triggers automatically and follows the canonical order in Section 4.1
- [ ] Final message text appears
- [ ] Audio can intentionally stop/transition into silence
- [ ] Screen reaches blackout / connection-lost state
- [ ] Thesis appears afterward, once, and only within the experience
- [ ] Experience can restart/refresh cleanly
- [ ] Production build succeeds (`npm run build` with no errors)

**Acceptance test in one sentence:** I can open the site, click Connect, travel from beginning to ending using only placeholder geometry, interact with at least one object in Feed/Graveyard/Memories, hear the audio system function, and reach the final blackout/thesis without developer intervention.

**Once this passes, the architecture freezes.** Frozen after Day 8:
- major state-management changes
- navigation paradigm changes
- scene ownership model changes
- swapping core libraries
- major directory restructuring
- rebuilding the camera system from scratch

Still allowed after Day 8 — this is not a freeze on ordinary implementation work:
- bug fixes
- tuning values
- visual implementation
- asset replacement
- performance optimization
- interaction polish
- audio content/crossfade tuning
- small refactors required to fix concrete problems

The intent is **no speculative structural rewrites after Day 8**, not a halt on building the project.

---

## 14. 18-Day Execution Roadmap

**August 13 – August 30, 2026**

| Day | Date | Objective | Deliverables | Exit criteria | Explicitly not yet |
|---|---|---|---|---|---|
| 1 | Aug 13 | Toolchain + repo skeleton (local only, no deployment) | Verify Node/npm version; `npm create vite` React app; install Day-1 core dependencies (`three @react-three/fiber @react-three/drei gsap`); basic folder/source skeleton from Section 6; empty Canvas renders a spinning placeholder cube; initialization commit(s) | `npm run dev` shows a cube; `npm run build` succeeds locally | Deployment, progression, camera paths, Zustand, audio, Prelude, interactions, real content/scenes, asset hunting, visual polish |
| 2 | Aug 14 | Progression state + camera rig skeleton | Install Zustand; progression store (0→1); a camera rig component that lerps position along hardcoded waypoints based on progression; scroll/wheel input wired to progression | Scrolling visibly moves the camera between 2 dummy points | Styling, lighting design |
| 3 | Aug 15 | Prelude skeleton | Connect button UI; boot status text sequence (placeholder copy); click triggers state transition into "world" state | Click → short text sequence → camera enters world state | Audio |
| 4 | Aug 16 | Audio engine foundation | Install Web Audio API wrapper foundation (no external package required); `useAudioEngine` hook; unlock-on-click; one placeholder ambient loop; fade in/out working | Clicking Connect starts audio; fade works | Per-area audio variety |
| 5 | Aug 17 | All 4 area waypoints + placeholder landmarks | Each area gets a waypoint cluster and a placeholder box/plane landmark; full path scrollable start to finish | Full scroll-through, placeholder geometry, reaches an end state | Real geometry, real copy |
| 6 | Aug 18 | Interaction layer | R3F pointer events on one placeholder object each in Feed, Graveyard, and Memories; hover/click triggers a visible reaction (color/scale change); Area 4 wired to its automatic proximity/progression trigger, no manual interaction added | Feed, Graveyard, and Memories each demonstrably support one interaction; Area 4 reaches its ending automatically | Final visual polish |
| 7 | Aug 19 | Finale sequence | Terminal placeholder; auto-trigger on reaching Area 4 waypoint; full canonical sequence from Section 4.1 (final line, silence beat, blackout, `CONNECTION LOST`, thesis text) | Reaching the end plays the full sequence without input | Real terminal art |
| 8 | Aug 20 | **Vertical slice completion + first production deployment** | Run the Section 13 checklist end to end; fix blockers; set up hosting (Vercel or Netlify); first live production deployment | Vertical slice checklist fully passes on a live URL; architecture freeze (Section 13) begins | Any visual beautification |
| 9 | Aug 21 | Prelude + Feed visual pass | Real Feed corridor geometry/material direction; real fragment text data; lighting pass for uncertainty/recognition stages | Prelude and Feed feel intentional, not placeholder | Graveyard/Memories/Last Message |
| 10 | Aug 22 | Graveyard visual pass, part 1 | CAPTCHA monolith modeling/build begins; base Graveyard lighting/contrast pass | Monolith silhouette recognizable in-scene | Full relic set |
| 11 | Aug 23 | Graveyard visual pass, part 2 | Finish CAPTCHA monolith; add 2–3 supporting relics; Graveyard audio pass | Graveyard hero shot is screenshot-ready | Memories area |
| 12 | Aug 24 | Memories visual pass, part 1 | Constellation landmark structure; memory fragment data + placeholder imagery; warm lighting introduced | Memories area reads as the emotional pivot | Last Message polish |
| 13 | Aug 25 | Memories visual pass, part 2 | Final memory imagery/AI-generated assets in place; interaction polish; shared memory-reconstruction audio cue integrated and tuned | Memories fully finished at MUST/SHOULD level | Unique per-memory sound effects (remain COULD-tier stretch polish, not scheduled work); Last Message |
| 14 | Aug 26 | Last Message visual pass | Terminal model/art; final copy locked; lighting drain to neutral/pale; blackout timing tuned to the Section 4.1 sequence | Finale sequence is fully finished, not placeholder | New scope of any kind — scope freeze begins today |
| 15 | Aug 27 | Full audio presentation pass | Per-area ambient variety (if in scope as SHOULD), all MUST-level cues finalized, silence beats confirmed against Section 4.1, mute control finished | Full playthrough sounds intentional start to finish | New visual assets; redesigning the audio engine/system chosen in Section 5 |
| 16 | Aug 28 | Performance + mobile/touch pass | Apply Section 10 budget; test on a mid-range phone; swipe/drag input tuned; reduce particle/post-processing where needed | Smooth playthrough on desktop and at least one real mobile device | New features |
| 17 | Aug 29 | Full integration QA + second (QA) deployment | Full playthrough testing across 2–3 realistically accessible browser engines/devices (Section 15); fix bugs found; redeploy to production as a QA update; accessibility checklist (Section 11) pass | Clean full playthrough, no console errors, deployed | Cosmetic tweaking beyond bug fixes |
| 18 | Aug 30 | Feature freeze + submission prep begins | Code freeze on features; README written; credits/licensing file finalized; screenshots captured; Devpost draft written | Repo and site are submission-ready in substance; only buffer-day tasks remain | Any new feature or asset work |

---

## 15. August 31 — Buffer / Final Smoke Test / Submission Day

Treat as buffer only. Checklist:

- [ ] Final production deployment (smoke test) confirmed live
- [ ] Full smoke test on the live URL (not localhost)
- [ ] Desktop browser check across 2–3 realistically accessible engines: Chrome, Firefox, Edge, and Safari only where a macOS/iOS device is actually available — do not treat Safari as mandatory if no Safari-capable machine exists; the live site should remain standards-compliant and not intentionally Chrome-only
- [ ] Mobile sanity check on at least one real device
- [ ] No console errors on a full playthrough
- [ ] No broken asset URLs (models, textures, audio all resolve)
- [ ] Sound/mute behavior confirmed working per Section 8
- [ ] Basic performance sanity check (no major stutter on load or transitions)
- [ ] Minimum 3 screenshots captured (prioritize the CAPTCHA monolith as one)
- [ ] Project description written for Devpost
- [ ] Technologies/tools list compiled
- [ ] Repository link confirmed public and working
- [ ] Source code visible and buildable by a stranger following the README
- [ ] Credits/licenses file (`docs/CREDITS.md`) complete and accurate
- [ ] README finalized (includes thesis line, per Section 2's principle 7 discipline — visible in docs, not mid-experience)
- [ ] Optional demo video recorded/edited if time allows
- [ ] Devpost submission form completed and verified submitted well before 3:30 AM IST / 5:00 PM CDT

---

## 16. Risk Register

| Risk | Likelihood | Impact | Early warning sign | Mitigation | Fallback/cut |
|---|---|---|---|---|---|
| 3D performance problems | Medium | High | Frame stutter during dev on a mid-tier machine | Follow Section 10 budget from Day 1, not retroactively | Cut particle density and post-processing first |
| Camera/navigation feels bad | Medium | High | Playtesting feels disorienting or nauseating | Test camera path by Day 5, not Day 15 | Simplify easing, reduce parallax, straighten path |
| Audio integration problems | Medium | Medium | Browser blocks playback, click-unlock fails on some browser | Build and test the Web Audio API engine (Section 5, Section 8) by Day 4 | Ship with a working mute control and the silent fallback described in Section 8 |
| Asset hunt consumes too much time | High | Medium | Spending a full day "looking for the right texture" | Default to built/generated assets per Section 9; time-box searches to <1 hr | Use simpler procedural materials |
| Mobile limitations | Medium | Medium | Touch input feels broken or scene doesn't fit viewport | Dedicated mobile pass on Day 16, not last-minute | Ship a simplified/lower-fidelity mobile mode if needed |
| Over-polishing one area | High | High | Spending 3+ days on the Graveyard alone | Roadmap allocates fixed days per area; respect them | Move to next area even if current one isn't "perfect" |
| Shader/post-processing rabbit holes | Medium | Medium | Tweaking bloom values for hours with no plan | Cap post-processing scope per Section 5; freeze effect stack early | Use Drei/postprocessing defaults, minimal customization |
| Scene transitions become brittle | Medium | High | Adding a new area breaks camera timing elsewhere | Keep waypoints data-driven and area-independent per Section 5 | Hardcode transition values as last resort if data-driven approach breaks |
| Final deployment problems | Low-Medium | High | Production build behaves differently than dev | Deploy early (Day 8) and again (Day 17), with a final smoke test on Aug 31 — never deploy for the first time on Aug 31 | Have a known-good previous deploy to roll back to |
| Scope creep | High | High | New "cool idea" appears after Day 14 | Hard scope freeze Day 14 per roadmap and Section 13 | Log the idea in a "future ideas" note, do not build it now |
| Burnout/time loss | Medium | High | Skipping days, falling behind roadmap silently | Check roadmap daily; if 2+ days behind, invoke Section 17 cut order immediately | Cut per Section 17 rather than compressing sleep/quality |
| AI-generated code becomes inconsistent/overengineered | Medium | Medium | Copilot/ChatGPT-generated code introduces unnecessary abstraction or diverging patterns across areas | Enforce the Section 6 structure and Section 5 config-driven pattern explicitly in prompts; review before merging | Refactor to match the shared `<Area>` pattern before it spreads further |

---

## 17. Cut Order

If the schedule slips, cut in this order — protect the emotional arc above all else. Nothing marked MUST in Section 12 appears here as an early cut; where a MUST item has a graceful degradation path (e.g. audio failing over to the silent fallback in Section 8), that degradation is the fallback, not a contradiction of the MUST.

1. COULD-tier polish items (Section 12) — cut first, no discussion needed
2. Per-area unique ambient variety (SHOULD-tier) → collapse to one evolving bed
3. Extra Graveyard relics beyond the CAPTCHA monolith (SHOULD-tier)
4. Reduced-motion/full accessibility polish beyond the baseline mute + contrast
5. Demo video
6. Mobile fine-tuning → ship a functional but less-polished mobile mode
7. Visual richness of the least-critical area (evaluate at cut-time, likely Feed) → simplify before touching Graveyard, Memories, or Last Message
8. **Never cut (protected MUST elements):** the CAPTCHA monolith, the finale sequence (Section 4.1), the thesis reveal, the guided progression working start to finish, a public deployed build

---

## 18. Git / Development Discipline

- `main` should remain deployable at all times after Day 8 (post vertical-slice deploy)
- Commit at logical unit size — one feature, fix, or asset addition per commit, not end-of-day mega-commits
- Commit message style: `type: short description` (e.g. `feat: add graveyard captcha monolith geometry`, `fix: camera easing on mobile swipe`, `chore: initialize The Last Website`)
- Tag milestones: `v0.1-vertical-slice`, `v0.2-visual-pass-complete`, `v1.0-submission`
- No long-lived feature branches needed for a solo project — direct commits to `main` are fine as long as each commit leaves the app in a working state; use a short-lived branch only for something genuinely risky/experimental
- Avoid "everything changed" commits — if a change touches unrelated areas, split it

---

## 19. Definition of Done — Final Submission

This section is the **Target Definition of Done**: the intended polished state reached if schedule permits. It may include stronger quality requirements than the Emergency Submission Floor in Section 12. If time runs out before every item below is true, submit against the Emergency Submission Floor instead of missing the deadline — see Section 12.

Allowed to stop changing the project when **all** of the following are true:

- **Narrative:** full journey from Connect to thesis reveal plays correctly, unblocked, every time, following the canonical sequence in Section 4.1
- **UX:** no dead ends, no confusing input, mute control works, mobile path works
- **Visual:** all four areas plus prelude match their intended silhouette and lighting stage; no placeholder geometry remains
- **Audio:** ambient + cues + intentional silences all function per Section 8; mute works; graceful silent fallback confirmed
- **Technical:** production build succeeds with no console errors on a full playthrough
- **Performance:** smooth on desktop and at least one real mobile device tested
- **Deployment:** live on a stable public URL, tested from a clean session (not just localhost)
- **Documentation:** README complete, thesis line present in docs (not mid-experience), `docs/CREDITS.md` accurate and complete
- **Devpost readiness:** description, screenshots, tech list, source link, and (if made) demo video all submitted and verified before the deadline

---

## 20. Immediate Next Actions

The canonical project plan already lives at `docs/PROJECT_PLAN.md`. These actions cover only Day 1, local scaffold work — no deployment, no Day 2 work.

1. Run `node -v` and `npm -v`; confirm compatibility with the current Vite requirements before initializing anything.
2. `npm create vite@latest` inside the repo, React template.
3. Install Day-1 core dependencies: `three @react-three/fiber @react-three/drei gsap`.
4. Create the folder/source skeleton from Section 6 (empty placeholder files/`.gitkeep` where needed; `docs/CREDITS.md` may stay an empty stub for now).
5. Build the Day 1 deliverable: a Canvas rendering a single rotating placeholder cube.
6. Confirm `npm run dev` shows the cube.
7. Confirm `npm run build` succeeds.
8. Make appropriate initialization commit(s), e.g. `chore: initialize The Last Website`.

Stop after Day 1. Begin Day 2 only after the cube renders and `npm run build` succeeds.
