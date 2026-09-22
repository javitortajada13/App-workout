// Mirrors apps/mobile/src/lib/video.ts -- same small derivation, not shared
// as a package since it's this little (see apps/admin/src/lib/api.ts's own
// comment on why the two apps don't share an HTTP client either).
export function youtubeThumbnailUrl(videoUrl: string): string | null {
  const match = videoUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}
