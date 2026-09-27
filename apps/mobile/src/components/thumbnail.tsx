import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { Type } from "@/constants/typography";
import { useTheme } from "@/hooks/use-theme";
import { youtubeThumbnailUrl } from "@/lib/video";

type Size = "row" | "hero";

interface ThumbnailProps {
  videoUrl: string | null;
  size: Size;
  previewLabel: string;
  noVideoLabel?: string;
}

// Three real states -- not a design fiction:
// 1. Has video, thumbnail image loads: real YouTube preview + play glyph.
// 2. Has video, thumbnail image fails to load (network-blocked, taken
//    down, etc.): striped placeholder + play glyph, still tagged as a
//    preview -- the video itself still exists, only its poster doesn't.
// 3. No video at all: quiet icon panel, no play glyph, no tag. A
//    genuinely different state, not the same box with a missing image.
export function Thumbnail({ videoUrl, size, previewLabel, noVideoLabel }: ThumbnailProps) {
  const theme = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const thumb = videoUrl ? youtubeThumbnailUrl(videoUrl) : null;
  const dims = size === "row" ? styles.rowBox : styles.heroBox;

  if (!videoUrl || !thumb) {
    return (
      <View style={[dims, styles.box, styles.center, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="walk-outline" size={size === "row" ? 22 : 34} color={theme.textSecondary} style={{ opacity: 0.55 }} />
        {size === "hero" && noVideoLabel && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.noVideoLabel}>
            {noVideoLabel}
          </ThemedText>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        dims,
        styles.box,
        imageFailed && [styles.placeholder, { backgroundColor: theme.backgroundElement, borderColor: theme.border }],
      ]}
    >
      {!imageFailed && (
        <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} onError={() => setImageFailed(true)} />
      )}
      <View style={styles.playWrap}>
        <View style={[styles.playDisc, size === "hero" && styles.playDiscHero]}>
          <Ionicons name="play" size={size === "row" ? 13 : 24} color="#FFFFFF" style={styles.playIcon} />
        </View>
      </View>
      <View style={[styles.tag, size === "hero" && styles.tagHero]}>
        <ThemedText style={styles.tagText}>{previewLabel}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: "relative", overflow: "hidden" },
  rowBox: { width: 76, height: 54, borderRadius: 10, flexShrink: 0 },
  heroBox: { width: "100%", aspectRatio: 16 / 9, borderRadius: 22 },
  center: { alignItems: "center", justifyContent: "center" },
  placeholder: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  noVideoLabel: { marginTop: 6 },
  playWrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  playDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(20,23,26,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  playDiscHero: { width: 52, height: 52, borderRadius: 26 },
  playIcon: { marginLeft: 2 },
  tag: {
    position: "absolute",
    bottom: 3,
    right: 4,
    backgroundColor: "rgba(20,23,26,0.6)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tagHero: { bottom: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: {
    ...Type.label,
    fontSize: 7.5,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
});
