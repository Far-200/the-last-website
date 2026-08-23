import { useCallback, useState } from "react";
import Prelude from "./scenes/Prelude/Prelude";
import Feed from "./scenes/Feed/Feed";
import Graveyard from "./scenes/Graveyard/Graveyard";
import Memories from "./scenes/Memories/Memories";
import LastMessage from "./scenes/LastMessage/LastMessage";

// Scene ownership is exclusive: exactly one scene is mounted at a time,
// never more than one. Each boundary below is owned by the scene that
// fires it, and App only wires the boundaries together — it never
// reaches into a scene's internals or decides when a scene is done:
//
//   onConnected           Prelude, from its [ ENTER ARCHIVE ] action only
//   onThresholdCrossed    Feed, once its fade-to-black at the aperture
//                         completes
//   onVerificationComplete Graveyard, once the CAPTCHA's verification has
//                         failed, the warm cue has appeared and its exit
//                         fade has finished
//   onMemoriesComplete    Memories, once its own extinction sequence has
//                         faded the room to black
//   onRestart             LastMessage's [ RECONNECT ] control, available
//                         only after its own finale sequence has fully
//                         played out (see LastMessage.jsx's "ended" phase)
//
// Every one of those (other than onRestart, which is an explicit user
// choice at a deliberately quiet moment) fires from the end of a
// completed transition, so the mount swap always happens behind a fully
// opaque overlay and is never visible.
//
// There is no separate "ended" scene here. LastMessage's own post-thesis
// state is a phase inside that component, not a sixth mounted scene —
// nothing about it is visually or structurally distinct enough to
// justify a whole component just to show one faint button. Restarting
// simply returns `scene` to "prelude": every scene component is
// conditionally rendered, so React unmounts LastMessage and mounts a
// fresh Prelude, and every scene's own state (phase, refs, GSAP
// timelines) is freshly initialized by construction — no manual reset
// logic is needed anywhere else.
export default function App() {
  const [scene, setScene] = useState("prelude");

  const handleConnected = useCallback(() => {
    setScene("feed");
  }, []);

  const handleThresholdCrossed = useCallback(() => {
    setScene("graveyard");
  }, []);

  const handleVerificationComplete = useCallback(() => {
    setScene("memories");
  }, []);

  const handleMemoriesComplete = useCallback(() => {
    setScene("lastMessage");
  }, []);

  const handleRestart = useCallback(() => {
    setScene("prelude");
  }, []);

  if (scene === "lastMessage") return <LastMessage onRestart={handleRestart} />;
  if (scene === "memories") {
    return <Memories onMemoriesComplete={handleMemoriesComplete} />;
  }
  if (scene === "graveyard") {
    return <Graveyard onVerificationComplete={handleVerificationComplete} />;
  }
  if (scene === "feed") return <Feed onThresholdCrossed={handleThresholdCrossed} />;
  return <Prelude onConnected={handleConnected} />;
}
