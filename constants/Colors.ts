// Scaley — Cerulean Blue theme
const cerulean = '#007BA7';
const ceruleanLight = '#4DA8C9';
const ceruleanDark = '#005F82';

export default {
  light: {
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceBorder: '#E5E7EB',
    tint: cerulean,
    tintLight: ceruleanLight,
    tintDark: ceruleanDark,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: cerulean,
    positive: '#10B981',
    negative: '#EF4444',
    warning: '#F59E0B',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#0F1117',
    surface: '#1A1D27',
    surfaceBorder: '#2D3140',
    tint: ceruleanLight,
    tintLight: cerulean,
    tintDark: '#8ED0E8',
    tabIconDefault: '#6B7280',
    tabIconSelected: ceruleanLight,
    positive: '#34D399',
    negative: '#F87171',
    warning: '#FBBF24',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof import('./Colors').default.light;
