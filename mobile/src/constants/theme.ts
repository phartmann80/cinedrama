export const Colors = {
  brand: {
    red: '#E8003D',
    dark: '#0A0A0F',
    card: '#12121A',
    border: '#1E1E2E',
    text: '#F0F0F5',
    muted: '#6B6B80',
    white: '#FFFFFF',
  },
  ui: {
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#3B82F6',
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
