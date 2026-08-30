# Transition pass — 2026-08-30

Frames captured from the real app (`npm run build` + `npm run preview`)
driven through Chromium with Playwright at 1600x900, except where noted.

Naming is by boundary, in the order the visitor meets them.

| prefix | what it covers |
| --- | --- |
| `A1` | Feed, at the end of its route: the collapsed terminal aperture's two rings framing the far aperture, with the closing fragment card inside the first one |
| `A2-*` | Feed's departure, sampled from the frame `data-arrival` flips to `leaving` — the camera passing through the mouth ring and then the inner frame |
| `B2` | The Graveyard's opening frame: standing inside the ruined archive mouth, looking out at the cemetery |
| `B3-*` | The Graveyard's first painted frames, at 900x506 so a screenshot is fast enough to land inside a 1.55s arrival. `B3-…-00` is the frame the mount swap happens on — a uniform `#0d1112`, which is exactly the value Feed handed over at |
| `B4` | A few seconds of scrolling later: through the mouth, cemetery opening out |
| `C1` | The Graveyard's closing composition, camera settled on the CAPTCHA |
| `C2-NN-<phase>-N` | The exit, sampled at intervals and labelled with the phase read live from the scene's own status narration rather than from an assumed clock |
| `D1-*` | Memories' first painted frames — the last flight of the same stair, then the room |
| `D2` | Memories settled at its normal opening pose |
| `reduced-motion/` | The same sequence under `prefers-reduced-motion: reduce` |

Two capture notes, both about measurement rather than about the app:

* Screenshots do not stall the page's frame loop here, so a 1.55s
  transition passes during a single 1.5s screenshot at 1600x900. The fast
  boundaries are therefore captured at a smaller viewport, where a
  screenshot costs about 0.7s.
* Absolute-time beat scheduling drifts badly across a twenty-second
  sequence for the same reason, so the exit frames are labelled from the
  live phase instead.
