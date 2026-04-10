export const Colors = {
  background: '#050510', // Deep Cosmic Navy
  card: '#0F0F1A',       // Subtle Navy card
  cardSelected: '#1A1A2E',
  
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textDim: '#5B5B5E',

  primary: '#00F5FF',    // Electric Cyan
  secondary: '#BF5AF2',  // Cosmic Purple
  worker: '#FF8C00',     // Vibrant Orange
  success: '#34C759',
  error: '#FF3B30',
  
  // Accents
  cyan: '#00F5FF',
  orange: '#FF8C00',
  green: '#00FF7F',
  pink: '#FF1493',
  purple: '#BF5AF2',
  deepBlue: '#121225',
  
  border: '#1C1C2E',
  inputBackground: '#0F0F1A',
  
  // Modern Surface Variants
  surface: '#0A0A1F',
  surfaceLight: '#1C1C2E',
  surfaceHighlight: '#2C2C4E',
  
  // Gradients
  cyanGradient: ['#00F5FF', '#007AFF'],
  orangeGradient: ['#FF8C00', '#FF5E00'],
  purpleGradient: ['#BF5AF2', '#FF2D55'],
  cosmicGradient: ['#050510', '#121225', '#050510'],
  glowingGradient: ['rgba(0, 245, 255, 0.15)', 'rgba(191, 90, 242, 0.15)'],
};

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  round: 999,
};

export const Typography = {
  h1: {
    fontSize: 40,
    fontWeight: '900' as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  h2: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
  },
  caption: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  threeD: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  threeDLight: {
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: -1 },
    textShadowRadius: 1,
  }
};

export const Shadows = {
  glow: {
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  neonPurple: {
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 12,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 8,
  },
  depth: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 20,
  },
  bevel: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.4)',
    borderRightColor: 'rgba(0,0,0,0.3)',
  }
};

export const Animation = {
  duration: 300,
  spring: {
    damping: 15,
    stiffness: 150,
  }
};
