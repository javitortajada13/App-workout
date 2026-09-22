/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Palette from the project's own design-preview artifact ("App Workout —
// Vista previa de diseño") -- a warm off-white / teal identity that was
// designed early on but never applied to the real app until now.
export const Colors = {
  light: {
    text: '#14171A',
    background: '#FAFAF8',
    backgroundElement: '#F1F1EE',
    backgroundSelected: '#E6E8E5',
    textSecondary: '#5B6169',
    accent: '#0C7C8C',
    accentContrast: '#FFFFFF',
    border: '#E2E4E1',
    warningBg: '#FBF1E6',
    warningBorder: '#B8752E',
  },
  dark: {
    text: '#F2F3F4',
    background: '#131518',
    backgroundElement: '#1C1F22',
    backgroundSelected: '#272B2F',
    textSecondary: '#98A0A7',
    accent: '#35D6C7',
    accentContrast: '#06231F',
    border: '#2A2E32',
    warningBg: '#2A2216',
    warningBorder: '#E0A85C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
