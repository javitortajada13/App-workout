// YouTube is the only video source in use today (see PROJECT_STATE.md --
// videos are found via web search and hand-entered as videoUrl; no CDN or
// upload pipeline exists yet). thumbnailUrl is a real schema field but
// nothing populates it, so thumbnails and the embed URL are both derived
// client-side from videoUrl for now -- swap to exercise.thumbnailUrl first
// if that ever gets populated.

export function youtubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? match[1] : null;
}

export function youtubeThumbnailUrl(videoUrl: string): string | null {
  const id = youtubeVideoId(videoUrl);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export function youtubeEmbedUrl(videoUrl: string): string | null {
  const id = youtubeVideoId(videoUrl);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
