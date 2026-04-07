export const Colors = {
  background: '#080808', // Deepest black
  card: '#121212',       // Dark charcoal for cards
  cardSelected: '#1A1A1A',
  
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textDim: '#5B5B5E',

  primary: '#00F5FF',    // Electric Cyan for Customers
  worker: '#FF8C00',     // Vibrant Orange for Workers
  success: '#34C759',
  error: '#FF3B30',
  
  // Accents
  cyan: '#00F5FF',
  orange: '#FF8C00',
  green: '#00FF7F',
  pink: '#FF1493',
  purple: '#AF52DE',
  
  border: '#2C2C2E',
  inputBackground: '#1C1C1E',
  
  // Gradients
  cyanGradient: ['#00F5FF', '#007AFF'],
  orangeGradient: ['#FF8C00', '#FF5E00'],
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
};

export const Shadows = {
  glow: {
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  }
};

export const Animation = {
  duration: 300,
  spring: {
    damping: 15,
    stiffness: 150,
  }
};
