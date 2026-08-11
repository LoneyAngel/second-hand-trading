export const theme = {
  colors: {
    text_default: 'rgba(0, 0, 0, 0.88)',
    text_price: 'rgba(242, 48, 48, 0.88)',
    text_secondary: 'rgba(0, 0, 0, 0.65)',
    bg_default: 'rgba(250, 255, 254, 1)',
    bg_gray: 'rgb(244, 246, 250)',
    button_bg_default: 'rgba(145, 242, 226, 1)',
    text_gray: 'rgb(190, 190, 190)',
    selected: '#0D9488',
    // selected: '#0E7490',
    // selected: '#0F766E',
    // selected: '#059669',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  radii: {
    sm: 5,
    md: 10,
    lg: 20,
  },

  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
  },

  fonts: {
    regular: 'SF Pro',
    medium: 'SF Pro Medium',
    light: 'SF Pro Light',
    price: 'DIN-Alternate',
  },
} as const;

export type Theme = typeof theme;
