import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'label'
    | 'button'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'label' && styles.label,
        type === 'button' && styles.button,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.accent }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

// V4's approved 5-tier weight ladder (see constants/typography.ts): 400
// reading / 500 metadata / 600 names / 700 labels+buttons / 800 headings.
// Each ThemedText `type` below maps onto exactly one tier so the ladder
// stays consistent everywhere it's used, not just in the new components.
const styles = StyleSheet.create({
  // metadata tier -- secondary/supporting text (dates, counts, captions).
  small: {
    ...Type.meta,
    fontSize: 14,
    lineHeight: 20,
  },
  // "name" tier -- list-row titles (session/program/exercise names, link
  // names). Renamed in spirit from "smallBold" (which pre-T2 conflated
  // this with the button/label tier) but kept as the same prop value so
  // existing call sites don't all need renaming -- only the ones that were
  // actually buttons moved to the new `button` type below.
  smallBold: {
    ...Type.name,
    fontSize: 14,
    lineHeight: 20,
  },
  // reading tier -- ordinary body copy.
  default: {
    ...Type.reading,
    fontSize: 16,
    lineHeight: 24,
  },
  // heading tier -- page titles.
  title: {
    ...Type.heading,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  // label tier -- sub-headings (empty-state titles, prominent card names).
  subtitle: {
    ...Type.label,
    fontSize: 19,
    lineHeight: 24,
  },
  // label tier -- small uppercase section headers ("POR QUE", "MUSCULOS", ...).
  label: {
    ...Type.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // label tier -- interactive button/toggle labels (distinct from smallBold
  // "names": a button says "Enviar", a name says "Sentadilla dividida...").
  button: {
    ...Type.label,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    ...Type.reading,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    ...Type.label,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
