import { Platform } from 'react-native';

// ─── Color Palette ──────────────────────────────────────────
export const Colors = {
  // Primary - IoT Blue
  primary: '#0EA5E9',
  primaryLight: '#38BDF8',
  primaryDark: '#0284C7',
  primaryMuted: 'rgba(14, 165, 233, 0.15)',

  // Accent - Cyan/Teal
  accent: '#06B6D4',
  accentLight: '#22D3EE',

  // Success - Green
  success: '#10B981',
  successLight: '#34D399',
  successMuted: 'rgba(16, 185, 129, 0.15)',

  // Warning - Amber
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  warningMuted: 'rgba(245, 158, 11, 0.15)',

  // Danger - Red
  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',

  // Dark theme backgrounds
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#334155',
  surface: '#1E293B',
  surfaceElevated: '#263548',

  // Glass effect
  glass: 'rgba(30, 41, 59, 0.7)',
  glassBorder: 'rgba(148, 163, 184, 0.15)',

  // Text
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  // Borders
  border: '#334155',
  borderLight: 'rgba(148, 163, 184, 0.1)',

  // Tab bar
  tabBar: '#0F172A',
  tabBarBorder: '#1E293B',
  tabIconDefault: '#64748B',
  tabIconActive: '#0EA5E9',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// ─── Spacing ────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// ─── Border Radius ──────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// ─── Typography ─────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

// ─── Shadows (for elevated surfaces) ────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
};
