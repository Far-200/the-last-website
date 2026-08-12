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
7. **The thesis is earned, not announced.** It appears once, after the ending, never as a preface.
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
- **Interaction:** Visitor clicks `[ ESTABLISH CONNECTION ]`
- **Sound:** Silence until click; click triggers the audio system to unlock and a faint connecting tone begins
- **Lighting:** Near-black, one cold dim glyph/cursor light
- **Exit condition:** 2–3 short status lines (searching, failure, "1 NODE RESPONDED"), then a hard cut into the world. Total duration target: ~5 seconds, not counting the click itself.

### Area 1 — The Feed
- **Emotional purpose:** Recognition
- **Landmark:** A broken data-stream corridor — a directional structure implying scale and motion, not a void
- **Interaction:** Approaching/looking at suspended fragments causes them to reconstruct/brighten briefly
- **Sound:** Cold ambient bed, occasional soft data-static texture, a subtle chime on fragment reconstruction
- **Lighting:** Cold, dim but increasingly legible; screen-glow as the only light sources
- **Exit condition:** Visitor continues forward (scroll/wheel/swipe) past a threshold point into Area 2

### Area 2 — The Graveyard
- **Emotional purpose:** Desolation
- **Landmark:** The CAPTCHA monolith — the hero visual of the entire project
- **Interaction:** Visitor can approach the CAPTCHA and other ruin fragments (dead loading spinner, 404 remnants, one buried cookie-consent panel); minimal hover/click responses, no puzzle
- **Sound:** Sparse — faint electrical hum, dead-air quality, near-silence in places; no music bed here, this section should feel emptier than Area 1, not just colder
- **Lighting:** Escalate through scale/contrast/architecture, not just color shift; harsh isolated light on monuments, deep shadow everywhere else
- **Exit condition:** Continued forward progression into Area 3

### Area 3 — Memories
- **Emotional purpose:** Intimacy
- **Landmark:** A constellation/archive structure of suspended memory fragments
- **Interaction:** Approach/hover/click individual memories (photo-like fragments); each reconstructs with a brief warm glow and a soft audio cue; no counter, no gating
- **Sound:** The warmest sound in the piece — distant, soft, human-adjacent (not literal voices/music that could read as licensed content); this is where the ambient bed should feel least mechanical
- **Lighting:** First real warmth in the experience — amber/gold, used sparingly enough that its arrival is a genuine shift
- **Exit condition:** Continued forward progression toward the final terminal

### Area 4 — The Last Message
- **Emotional purpose:** Absence
- **Landmark:** One isolated surviving server/terminal, alone in dark space
- **Interaction:** Visitor reaches the terminal; sequence plays automatically — no additional input required to trigger the ending
- **Sound:** Ambient bed thins out and drops away; final line appears in near-silence; then true silence; then a terminal-failure sound; then nothing
- **Lighting:** Warmth drains to pale/neutral machine light, then to black
- **Exit condition:** Terminal shows minimal status (files recovered, users online: 0, network offline), then: **"See you tomorrow."** → silence → blackout → `CONNECTION LOST` → pause → thesis line appears alone, quietly, then fades. Optional restart/credits affordance appears only after this, and subtly.

---

## 5. Technical Architecture

- **React** — app shell, routing between prelude/experience states, UI chrome that lives outside the canvas (connect button, mute control, loading screen)
- **React Three Fiber** — declarative scene composition; each area is a component tree, mountable/unmountable independently
- **Drei** — camera helpers, `useProgress`/loading utilities, text-in-3D, scroll helpers, image/texture abstractions — avoid reinventing plumbing Drei already solves
- **GSAP** — camera path choreography and directed transitions between area anchor points; timeline sequencing for the prelude boot text and the finale sequence
- **Audio layer** — a single custom hook/manager (e.g. `useAudioEngine`) wrapping the Web Audio API or Howler, exposing simple calls (`playBed(area)`, `playCue(id)`, `fadeTo(volume, duration)`, `mute()`); owns the unlock-on-click logic
- **Scene/progression state** — one lightweight state source (React context or a small store like Zustand) tracking current area, progression value (0–1 or discrete waypoints), and whether the finale has fired. Avoid Redux-scale machinery.
- **Asset management** — content (fragment text, memory captions, terminal copy) lives in plain data files, not hardcoded inside components, so copy edits don't touch scene code
- **Post-processing** — a single shared post-processing stack (bloom, subtle vignette, restrained chromatic aberration) configured once and toggled/intensity-adjusted per area via props, not five separate pipelines

**Recommended pattern:** progression-driven, config-driven scenes. Each area is defined by a small data object (landmark type, camera waypoints, interactable fragment list, lighting preset, audio cues) consumed by a shared `<Area>`-style component where practical. This keeps individual areas cuttable and keeps Claude/Copilot-generated code from sprawling into five bespoke, inconsistent implementations.

---

## 6. Proposed Repository Structure

```
the-last-website/
├── docs/
│   └── PROJECT_PLAN.md
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
│   │   └── progressionStore.js
│   ├── hooks/
│   ├── styles/
│   └── assets/
│       ├── models/
│       └── textures/
├── PROJECT_PLAN.md -> docs/PROJECT_PLAN.md (or just keep it only in docs/)
├── README.md
├── LICENSE
├── package.json
└── vite.config.js
```

No deeper abstraction than this is needed. Resist adding a generic "engine" layer.

---

## 7. Navigation / Camera System

**Chosen approach: scroll/wheel/touch-driven progression along a single authored camera path, with local look/interact freedom at waypoints.**

- A single normalized progression value (0 → 1) maps to a position along a GSAP-driven (or manually interpolated) camera path built from fixed waypoints — one cluster of waypoints per area.
- Forward input (scroll wheel, swipe, or a simple "continue" affordance on touch) advances progression; there is no backward-locking requirement, but backward movement is not a design priority — build it only if trivial.
- At each area's primary waypoint, the camera settles/eases to a near-static framing. While settled, the visitor can nudge look direction (subtle mouse-parallax or drag-to-look) and hover/click nearby interactable objects via standard R3F pointer events (raycasting is handled by R3F's built-in pointer system, not custom raycasting code).
- There is no map, no free translation, no collision system to build.
- **Mobile/touch degradation:** swipe-to-advance replaces scroll; drag-to-look replaces mouse parallax; interaction targets sized generously for touch; if performance requires it, reduce particle density and post-processing before removing any narrative content.
- **Getting lost is structurally impossible** — the visitor cannot leave the authored path. The only choice is pace, not direction.

---

## 8. Audio Plan

- **Minimum required for MVP:** one ambient bed that shifts per area (can be one evolving track with per-area parameter changes rather than five separate files), a connection/start cue, one interaction cue reused across fragments, a terminal-failure sound, and true silence used deliberately before/after the final line.
- **Optional enhancements:** distinct ambient beds per area, unique cues per memory, subtle spatial audio tied to object proximity.
- **When audio starts:** only after the prelude click (solves browser autoplay restrictions and is diegetic — the visitor initiates the connection).
- **Volume/fades/transitions:** cross-fade between area ambience over ~1–2 seconds at waypoint transitions; no hard cuts except the two intentional ones (into silence before the final line, and the terminal-failure cut to black).
- **Intentional silence:** after "See you tomorrow." and before `CONNECTION LOST`. This is a designed beat — do not fill it with anything.
- **Licensing:** use royalty-free/CC0 ambient beds and self-generated or clearly-licensed SFX only; keep a `docs/CREDITS.md` or README section listing every audio source and its license before submission.
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

**Discipline:** maintain a `docs/CREDITS.md` listing every third-party asset, its source, and its license before submission. Nothing goes in the repo without a known license.

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
- **Audio controls:** a persistent, simple mute/volume toggle, reachable at all times, defaulting to on but never forced.
- **Mobile/touch:** swipe-to-advance and drag-to-look as described in Section 7; touch targets sized generously.
- **WebGL failure fallback:** if WebGL context creation fails, show a static fallback screen with the title, hook, thesis, and a note that the full experience requires WebGL — do not leave the visitor at a blank page.

---

## 12. Scope Matrix

### MUST (ship even if everything else goes wrong)
- Prelude with click-to-connect and audio unlock
- All four areas present with at least placeholder-quality visuals matching their intended silhouette
- Guided camera progression start to finish, no dead ends
- CAPTCHA monolith as a real, finished asset (this is non-negotiable — it's the hero image)
- At least one working local interaction per area
- Terminal finale sequence with the final line, silence, blackout, and thesis reveal
- Baseline ambient audio + the two intentional silences
- Mute control
- Deployed, publicly accessible production build
- README, credits/licensing, and Devpost submission materials

### SHOULD (intended polished submission)
- Distinct ambient bed per area
- Reconstructing/brightening animation on all Feed and Memories fragments
- Full set of Graveyard relics (404, spinner, cookie banner) beyond the CAPTCHA
- Reduced-motion support
- Mobile swipe/touch path fully tuned
- Demo video

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
- [ ] At least one representative local interaction works
- [ ] Each area has a placeholder spatial landmark (not just a void)
- [ ] Visitor can reach the finale without completing any optional interaction
- [ ] Final placeholder terminal sequence triggers automatically
- [ ] Final message text appears
- [ ] Audio can intentionally stop/transition into silence
- [ ] Screen reaches blackout / connection-lost state
- [ ] Thesis appears afterward
- [ ] Experience can restart/refresh cleanly
- [ ] Production build succeeds (`npm run build` with no errors)

**Acceptance test in one sentence:** I can open the site, click Connect, travel from beginning to ending using only placeholder geometry, interact with at least one object, hear the audio system function, and reach the final blackout/thesis without developer intervention.

Once this passes, stop touching architecture and start replacing placeholders.

---

## 14. 18-Day Execution Roadmap

**August 13 – August 30, 2026**

| Day | Date | Objective | Deliverables | Exit criteria | Explicitly not yet |
|---|---|---|---|---|---|
| 1 | Aug 13 | Toolchain + repo skeleton | Verify Node/npm version; `npm create vite` React app; install R3F, Drei, GSAP; basic folder structure from Section 6; empty Canvas renders a spinning placeholder cube | `npm run dev` shows a cube; `npm run build` succeeds | Any real content |
| 2 | Aug 14 | Progression state + camera rig skeleton | Progression store (0→1); a camera rig component that lerps position along hardcoded waypoints based on progression; scroll/wheel input wired to progression | Scrolling visibly moves the camera between 2 dummy points | Styling, lighting design |
| 3 | Aug 15 | Prelude skeleton | Connect button UI; boot status text sequence (placeholder copy); click triggers state transition into "world" state | Click → short text sequence → camera enters world state | Audio |
| 4 | Aug 16 | Audio engine foundation | `useAudioEngine` hook; unlock-on-click; one placeholder ambient loop; fade in/out working | Clicking Connect starts audio; fade works | Per-area audio variety |
| 5 | Aug 17 | All 4 area waypoints + placeholder landmarks | Each area gets a waypoint cluster and a placeholder box/plane landmark; full path scrollable start to finish | Full scroll-through, placeholder geometry, reaches an end state | Real geometry, real copy |
| 6 | Aug 18 | Interaction layer | R3F pointer events on one placeholder object per area; hover/click triggers a visible reaction (color/scale change) | At least one interaction per area demonstrably works | Final visual polish |
| 7 | Aug 19 | Finale sequence | Terminal placeholder; auto-trigger on reaching Area 4 waypoint; final line, silence beat, blackout, `CONNECTION LOST`, thesis text | Reaching the end plays the full sequence without input | Real terminal art |
| 8 | Aug 20 | **Vertical slice completion + first deploy** | Run the Section 13 checklist end to end; fix blockers; deploy to production hosting (Vercel/Netlify) | Vertical slice checklist fully passes on a live URL | Any visual beautification |
| 9 | Aug 21 | Prelude + Feed visual pass | Real Feed corridor geometry/material direction; real fragment text data; lighting pass for uncertainty/recognition stages | Prelude and Feed feel intentional, not placeholder | Graveyard/Memories/Last Message |
| 10 | Aug 22 | Graveyard visual pass, part 1 | CAPTCHA monolith modeling/build begins; base Graveyard lighting/contrast pass | Monolith silhouette recognizable in-scene | Full relic set |
| 11 | Aug 23 | Graveyard visual pass, part 2 | Finish CAPTCHA monolith; add 2–3 supporting relics; Graveyard audio pass | Graveyard hero shot is screenshot-ready | Memories area |
| 12 | Aug 24 | Memories visual pass, part 1 | Constellation landmark structure; memory fragment data + placeholder imagery; warm lighting introduced | Memories area reads as the emotional pivot | Last Message polish |
| 13 | Aug 25 | Memories visual pass, part 2 | Final memory imagery/AI-generated assets in place; interaction polish; memory-specific audio cues | Memories fully finished | Last Message |
| 14 | Aug 26 | Last Message visual pass | Terminal model/art; final copy locked; lighting drain to neutral/pale; blackout timing tuned | Finale sequence is fully finished, not placeholder | New scope of any kind — scope freeze begins today |
| 15 | Aug 27 | Full audio pass | Per-area ambient variety (if in scope), all cues finalized, silence beats confirmed, mute control finished | Full playthrough sounds intentional start to finish | New visual assets |
| 16 | Aug 28 | Performance + mobile/touch pass | Apply Section 10 budget; test on a mid-range phone; swipe/drag input tuned; reduce particle/post-processing where needed | Smooth playthrough on desktop and at least one real mobile device | New features |
| 17 | Aug 29 | Full integration QA + second deploy | Full playthrough testing across 2–3 browsers; fix bugs found; redeploy production; accessibility checklist (Section 11) pass | Clean full playthrough, no console errors, deployed | Cosmetic tweaking beyond bug fixes |
| 18 | Aug 30 | Freeze + submission prep begins | Code freeze on features; README written; credits/licensing file finalized; screenshots captured; Devpost draft written | Repo and site are submission-ready in substance; only buffer-day tasks remain | Any new feature or asset work |

---

## 15. August 31 Release / Submission Day

Treat as buffer only. Checklist:

- [ ] Final production deployment confirmed live
- [ ] Full smoke test on the live URL (not localhost)
- [ ] Desktop browser check: Chrome, Firefox, Safari (or best available subset)
- [ ] Mobile sanity check on at least one real device
- [ ] No console errors on a full playthrough
- [ ] No broken asset URLs (models, textures, audio all resolve)
- [ ] Sound/mute behavior confirmed working
- [ ] Basic performance sanity check (no major stutter on load or transitions)
- [ ] Minimum 3 screenshots captured (prioritize the CAPTCHA monolith as one)
- [ ] Project description written for Devpost
- [ ] Technologies/tools list compiled
- [ ] Repository link confirmed public and working
- [ ] Source code visible and buildable by a stranger following the README
- [ ] Credits/licenses file complete and accurate
- [ ] README finalized (includes thesis line, per Section 2's principle 7 discipline — visible in docs, not mid-experience)
- [ ] Optional demo video recorded/edited if time allows
- [ ] Devpost submission form completed and verified submitted well before 3:30 AM IST / 5:00 PM CDT

---

## 16. Risk Register

| Risk | Likelihood | Impact | Early warning sign | Mitigation | Fallback/cut |
|---|---|---|---|---|---|
| 3D performance problems | Medium | High | Frame stutter during dev on a mid-tier machine | Follow Section 10 budget from Day 1, not retroactively | Cut particle density and post-processing first |
| Camera/navigation feels bad | Medium | High | Playtesting feels disorienting or nauseating | Test camera path by Day 5, not Day 15 | Simplify easing, reduce parallax, straighten path |
| Audio integration problems | Medium | Medium | Browser blocks playback, click-unlock fails on some browser | Build and test audio engine by Day 4 | Ship with a working mute-by-default and silent fallback |
| Asset hunt consumes too much time | High | Medium | Spending a full day "looking for the right texture" | Default to built/generated assets per Section 9; time-box searches to <1 hr | Use simpler procedural materials |
| Mobile limitations | Medium | Medium | Touch input feels broken or scene doesn't fit viewport | Dedicated mobile pass on Day 16, not last-minute | Ship a simplified/lower-fidelity mobile mode if needed |
| Over-polishing one area | High | High | Spending 3+ days on the Graveyard alone | Roadmap allocates fixed days per area; respect them | Move to next area even if current one isn't "perfect" |
| Shader/post-processing rabbit holes | Medium | Medium | Tweaking bloom values for hours with no plan | Cap post-processing scope per Section 5; freeze effect stack early | Use Drei/postprocessing defaults, minimal customization |
| Scene transitions become brittle | Medium | High | Adding a new area breaks camera timing elsewhere | Keep waypoints data-driven and area-independent per Section 5 | Hardcode transition values as last resort if data-driven approach breaks |
| Final deployment problems | Low-Medium | High | Production build behaves differently than dev | Deploy early (Day 8) and again (Day 17), not just on Day 31 | Have a known-good previous deploy to roll back to |
| Scope creep | High | High | New "cool idea" appears after Day 14 | Hard scope freeze Day 14 per roadmap and Section 12 | Log the idea in a "future ideas" note, do not build it now |
| Burnout/time loss | Medium | High | Skipping days, falling behind roadmap silently | Check roadmap daily; if 2+ days behind, invoke Section 17 cut order immediately | Cut per Section 17 rather than compressing sleep/quality |
| AI-generated code becomes inconsistent/overengineered | Medium | Medium | Copilot/ChatGPT-generated code introduces unnecessary abstraction or diverging patterns across areas | Enforce the Section 6 structure and Section 5 config-driven pattern explicitly in prompts; review before merging | Refactor to match the shared `<Area>` pattern before it spreads further |

---

## 17. Cut Order

If the schedule slips, cut in this order — protect the emotional arc above all else:

1. COULD-tier polish items (Section 12) — cut first, no discussion needed
2. Per-area unique ambient variety → collapse to one evolving bed
3. Extra Graveyard relics beyond the CAPTCHA monolith
4. Reduced-motion/full accessibility polish beyond the baseline mute + contrast
5. Demo video
6. Mobile fine-tuning → ship a functional but less-polished mobile mode
7. Visual richness of the least-critical area (evaluate at cut-time, likely Feed) → simplify before touching Graveyard, Memories, or Last Message
8. Never cut: the CAPTCHA monolith, the finale sequence, the thesis reveal, the guided progression working start to finish, a public deployed build

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

Allowed to stop changing the project when **all** of the following are true:

- **Narrative:** full journey from Connect to thesis reveal plays correctly, unblocked, every time
- **UX:** no dead ends, no confusing input, mute control works, mobile path works
- **Visual:** all four areas plus prelude match their intended silhouette and lighting stage; no placeholder geometry remains
- **Audio:** ambient + cues + intentional silences all function; mute works; graceful silent fallback confirmed
- **Technical:** production build succeeds with no console errors on a full playthrough
- **Performance:** smooth on desktop and at least one real mobile device tested
- **Deployment:** live on a stable public URL, tested from a clean session (not just localhost)
- **Documentation:** README complete, thesis line present in docs, credits/licensing file accurate and complete
- **Devpost readiness:** description, screenshots, tech list, source link, and (if made) demo video all submitted and verified before the deadline

---

## 20. Immediate Next Actions

1. Run `node -v` and `npm -v`; confirm compatibility with the current Vite requirements before initializing anything
2. `npm create vite@latest` inside the repo, React template
3. Install core dependencies: `three @react-three/fiber @react-three/drei gsap`
4. Commit `chore: initialize The Last Website` with the base Vite/React scaffold
5. Commit this file to `docs/PROJECT_PLAN.md`
6. Create the folder skeleton from Section 6 (empty placeholder files/`.gitkeep` where needed)
7. Build the Day 1 deliverable: a Canvas rendering a single placeholder cube, confirm `npm run build` succeeds
8. Set up hosting (Vercel or Netlify) and do a trivial first deploy of the empty scaffold, to remove any deployment-pipeline uncertainty early
9. Create a `docs/CREDITS.md` stub now, so asset licensing is tracked from the first sourced asset onward rather than reconstructed later
10. Begin Day 2 per the roadmap: progression state and camera rig skeleton
