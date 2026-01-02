/**
 * HLTHY AI Chat Theme Tokens & Effects
 * Design System for Futuristic Athletic UI
 */

// Core Colors
export const Colors = {
  bg: '#0B0B0C',
  surface: '#101114',
  text: '#EDEDF0',
  subtext: '#A3A6AD',
  accent: '#FF2D55',
  success: '#3EE68C',
  warn: '#FFB020',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Gradients
export const Gradients = {
  accentSweep: ['#FF7A00', '#FF2D55', '#9D4EDD'],
  auroraBg: ['#0C0C11', '#0E0D18'],
  successGlow: ['#11271A', '#0D1E14'],
  cardGlow: ['rgba(255, 45, 85, 0.08)', 'rgba(255, 45, 85, 0.02)'],
  neonStripe: ['rgba(255, 45, 85, 0.15)', 'rgba(157, 78, 221, 0.15)'],
} as const;

// Radius & Spacing
export const Layout = {
  radius: {
    card: 24,
    chip: 12,
    button: 16,
    small: 8,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  gap: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
} as const;

// Shadows & Glow (Android-friendly)
export const Effects = {
  cardShadow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8, // Android
  },
  glowBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  blurIntensity: 24,
} as const;

// Motion
export const Animation = {
  duration: {
    fast: 120,
    medium: 180,
    slow: 220,
    shimmer: 900,
  },
  easing: 'easeOutCubic' as const,
  scale: {
    press: 0.98,
    tap: 0.95,
  },
  fadeUp: 8,
} as const;

// Typography
export const Typography = {
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

// Intent Colors
export const IntentColors = {
  planner: {
    primary: '#FF6B35',
    gradient: ['#FF6B35', '#F7931E'],
    icon: '🏋️',
    label: 'WORKOUT PLANNER',
  },
  technique: {
    primary: '#F7931E',
    gradient: ['#F7931E', '#FFD700'],
    icon: '🎯',
    label: 'TECHNIQUE HELP',
  },
  explain: {
    primary: '#4ECDC4',
    gradient: ['#4ECDC4', '#45B7D1'],
    icon: '📚',
    label: 'EDUCATION',
  },
  schedule: {
    primary: '#45B7D1',
    gradient: ['#45B7D1', '#96CEB4'],
    icon: '📅',
    label: 'SCHEDULING',
  },
  chit_chat: {
    primary: '#96CEB4',
    gradient: ['#96CEB4', '#FFEAA7'],
    icon: '💬',
    label: 'CHAT',
  },
  default: {
    primary: '#d466ff',
    gradient: ['#d466ff', '#9f44ff'],
    icon: '🤖',
    label: 'AI ASSISTANT',
  },
} as const;

// Helper function to get intent config
export const getIntentConfig = (intent?: string) => {
  if (!intent || !(intent in IntentColors)) {
    return IntentColors.default;
  }
  return IntentColors[intent as keyof typeof IntentColors];
};
