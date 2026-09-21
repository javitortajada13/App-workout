import { createElement, useEffect, useRef } from "react";

// Web-only: loads the real YouTube IFrame Player API (not a plain <iframe>)
// so we can try to auto-select a Spanish dubbed audio track via
// getAvailableAudioTracks/setAudioTrack. The audio-track module isn't
// necessarily loaded yet when `onReady` fires -- confirmed via docs
// search: the player fires `onApiChange` when it loads (or unloads) a
// module with its own exposed methods, and that's the signal to poll for
// newly-available options like audio tracks, not `onReady`. Calling
// getAvailableAudioTracks() too early (only in onReady, as this used to
// do) can return an empty list even on a video that does have a Spanish
// dub, which is exactly the bug a real user hit. Still best-effort
// overall: if the methods don't exist, or no Spanish track is available
// for a given video, it silently falls back to the default track.
//
// NOT using youtube-nocookie.com as the host: tried it as a fix for a
// "sign in to confirm you're not a bot" report, but that turned out to
// be caused by the viewer's own VPN, unrelated to the embed host -- and
// the privacy-enhanced domain broke the Spanish-dub auto-selection below
// (most likely: it withholds the personalization data multi-language
// audio tracks depend on). Reverted; if the bot-check resurfaces for a
// real reason, the always-visible fallback link on the exercise screen
// covers it without needing this trade-off.
declare global {
  interface Window {
    YT?: { Player: new (elementId: string, config: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTAudioTrack {
  languageCode?: string;
}

interface YTPlayer {
  destroy?: () => void;
  getIframe?: () => HTMLIFrameElement;
  getAvailableAudioTracks?: () => YTAudioTrack[];
  setAudioTrack?: (track: YTAudioTrack) => void;
}

let apiLoadPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

function preferSpanishAudioTrack(player: YTPlayer) {
  try {
    if (typeof player.getAvailableAudioTracks !== "function") return;
    const tracks = player.getAvailableAudioTracks();
    const spanish = tracks?.find((t) => (t.languageCode ?? "").toLowerCase().startsWith("es"));
    if (spanish && typeof player.setAudioTrack === "function") {
      player.setAudioTrack(spanish);
    }
  } catch {
    // Best-effort only -- see file header comment.
  }
}

export function YoutubeEmbedWeb({ videoId, title }: { videoId: string; title: string }) {
  const containerId = `yt-player-${videoId}`;
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadYoutubeApi().then(() => {
      if (cancelled || !window.YT) return;
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: { enablejsapi: 1 },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            const iframe = event.target.getIframe?.();
            if (iframe) {
              iframe.style.width = "100%";
              iframe.style.height = "100%";
            }
            // Try immediately too -- harmless if the module isn't loaded
            // yet, and covers any video/browser where it already is.
            preferSpanishAudioTrack(event.target);
          },
          // The real signal that the audio-track module (and its data)
          // has actually loaded -- see file header comment.
          onApiChange: (event: { target: YTPlayer }) => {
            preferSpanishAudioTrack(event.target);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
    };
  }, [videoId, containerId]);

  return createElement("div", { id: containerId, title, style: { width: "100%", height: "100%" } });
}
