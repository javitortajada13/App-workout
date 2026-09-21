import { createElement, useEffect, useRef } from "react";

// Web-only: loads the real YouTube IFrame Player API (not a plain <iframe>)
// so we can try to auto-select a Spanish dubbed audio track via
// getAvailableAudioTracks/setAudioTrack once the player is ready. YouTube's
// official docs weren't reachable to confirm these methods' exact behavior
// across all videos/browsers, so this is best-effort: if the methods don't
// exist, or no Spanish track is available for a given video, it silently
// falls back to whatever YouTube would have played by default -- same as
// before this existed, never a broken player.
//
// Uses youtube-nocookie.com as the player host: Safari's cross-site
// tracking protection (ITP / iCloud Private Relay) stops the embedded
// player on youtube.com from seeing the viewer's logged-in cookies, which
// is what triggers YouTube's "sign in to confirm you're not a bot" check
// on embeds specifically (confirmed as a known, widely-reported issue via
// web search, not guessed) -- the privacy-enhanced domain avoids setting
// those cookies in the first place, which is the most effective fix found.
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
        host: "https://www.youtube-nocookie.com",
        playerVars: { enablejsapi: 1 },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            const iframe = event.target.getIframe?.();
            if (iframe) {
              iframe.style.width = "100%";
              iframe.style.height = "100%";
            }
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
