// Primary accent color used throughout the app
export const ACCENT_COLOR = '#FF2D55';

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    accent: ACCENT_COLOR,
    tabIconDefault: '#ccc',
    tabIconSelected: ACCENT_COLOR,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    accent: ACCENT_COLOR,
    tabIconDefault: '#666',
    tabIconSelected: ACCENT_COLOR,
  },
};
