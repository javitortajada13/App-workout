import { createElement, useEffect, useRef } from "react";

// Web-only: loads the real YouTube IFrame Player API (not a plain <iframe>)
// so we can try to auto-select a Spanish dubbed audio track via
// getAvailableAudioTracks/setAudioTrack. Two earlier attempts at this
// (calling it only in onReady, then adding onApiChange) didn't fix a real
// user's report of it not working, and this environment can't reach
// YouTube's own docs to verify the API's exact behavior -- so instead of
// guessing at a third fix, this version reports what actually happens via
// onDebug so it can be shown on-screen on the real device.
// TEMPORARY: remove onDebug/its call sites once the real cause is confirmed.
declare global {
  interface Window {
    YT?: { Player: new (elementId: string, config: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTAudioTrack {
  languageCode?: string;
  displayName?: string;
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

function preferSpanishAudioTrack(player: YTPlayer, source: string, log: (msg: string) => void) {
  try {
    if (typeof player.getAvailableAudioTracks !== "function") {
      log(`[${source}] getAvailableAudioTracks no existe`);
      return;
    }
    const tracks = player.getAvailableAudioTracks();
    log(`[${source}] tracks: ${JSON.stringify(tracks)}`);
    const spanish = tracks?.find((t) => (t.languageCode ?? "").toLowerCase().startsWith("es"));
    if (spanish && typeof player.setAudioTrack === "function") {
      player.setAudioTrack(spanish);
      log(`[${source}] setAudioTrack llamado con ${JSON.stringify(spanish)}`);
    } else if (!spanish) {
      log(`[${source}] no se encontro pista es en la lista`);
    } else {
      log(`[${source}] setAudioTrack no existe`);
    }
  } catch (e) {
    log(`[${source}] error: ${String(e)}`);
  }
}

export function YoutubeEmbedWeb({
  videoId,
  title,
  onDebug,
}: {
  videoId: string;
  title: string;
  onDebug?: (msg: string) => void;
}) {
  const containerId = `yt-player-${videoId}`;
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    const log = (msg: string) => onDebug?.(msg);
    let cancelled = false;
    log("cargando API de YouTube...");
    loadYoutubeApi().then(() => {
      if (cancelled || !window.YT) return;
      log("API cargada, creando player");
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
            preferSpanishAudioTrack(event.target, "onReady", log);
          },
          onApiChange: (event: { target: YTPlayer }) => {
            preferSpanishAudioTrack(event.target, "onApiChange", log);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, containerId]);

  return createElement("div", { id: containerId, title, style: { width: "100%", height: "100%" } });
}
