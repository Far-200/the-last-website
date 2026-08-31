import { useCallback, useState } from "react";
import useAudioEngine from "./audio/useAudioEngine";
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
//   onThresholdCrossed    Feed, once its own fog and lights have
//                         swallowed the final forward motion
//   onVerificationComplete Graveyard, once the CAPTCHA's verification has
//                         failed, the service door beside the monument has
//                         opened, and the camera has walked through it and
//                         part-way down the stairwell behind it
//   onMemoriesComplete    Memories, once its own extinction sequence has
//                         faded the room to black
//   onRestart             LastMessage's [ RECONNECT ] control, available
//                         only after its own finale sequence has fully
//                         played out (see LastMessage.jsx's "ended" phase)
//
// Every one of those (other than onRestart, which is an explicit user
// choice at a deliberately quiet moment) fires at the end of a completed
// local transition, and in both of the middle cases the concealment is
// now the WORLD rather than an overlay:
//
//   Feed -> Graveyard swaps while the camera is physically inside a
//   collapsed terminal aperture at the end of the nave with the fog
//   closed to six units around it, and the Graveyard opens on the
//   matching ruin on the other side of that same threshold.
//
//   Graveyard -> Memories swaps while the camera is four units down a
//   concrete service stair, and Memories opens on the last flight of the
//   same stair. Both scenes' fog, backdrop and overlay have arrived at
//   the identical value by then, so what the swap frame contains is
//   something that has stopped changing.
//
// The other boundaries retain their own authored concealment.
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
//
// The one thing App owns beyond scene identity is the soundtrack. That
// is not a global-state exception: it is the direct consequence of the
// rule above. Because App itself never unmounts while a scene swap
// does, App is the only place in the tree where a single continuous
// audio instance can survive Prelude -> Feed -> Graveyard -> Memories
// -> LastMessage. useAudioEngine holds one HTMLAudioElement outside the
// React tree (see that file); App passes down only two callbacks, at
// the two moments the narrative asks for:
//
//   onSoundtrackStart   Prelude, synchronously inside the CONNECT click
//                       itself — the browser's autoplay unlock gesture.
//                       Deliberately NOT onConnected, which fires much
//                       later, after Prelude's leaving dolly, by which
//                       point the user gesture no longer counts.
//   onSoundtrackDrain   LastMessage, at step 3 of the canonical finale
//                       ("ambient sound drains toward near-silence").
//
// No scene owns playback, and no scene can restart it.
export default function App() {
  const [scene, setScene] = useState("prelude");
  const soundtrack = useAudioEngine();

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

  if (scene === "lastMessage") {
    return (
      <LastMessage onRestart={handleRestart} onSoundtrackDrain={soundtrack.drain} />
    );
  }
  if (scene === "memories") {
    return <Memories onMemoriesComplete={handleMemoriesComplete} />;
  }
  if (scene === "graveyard") {
    return <Graveyard onVerificationComplete={handleVerificationComplete} />;
  }
  if (scene === "feed") return <Feed onThresholdCrossed={handleThresholdCrossed} />;
  return <Prelude onConnected={handleConnected} onSoundtrackStart={soundtrack.start} />;
}
