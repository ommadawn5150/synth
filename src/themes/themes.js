export const themes = {
  dawn: {
    name: 'Dawn',
    '--bg': '#F0EDE8',
    '--bg-panel': '#E4E0DA',
    '--bg-section': '#D8D3CC',
    '--accent': '#FF6B35',
    '--accent-dim': '#CC5528',
    '--text': '#1A1A1A',
    '--text-dim': '#6B6560',
    '--border': '#C8C3BB',
    '--key-white': '#FAFAF8',
    '--key-black': '#2A2520',
    '--key-active': '#FF6B35',
    '--knob-track': '#C8C3BB',
    '--knob-fill': '#FF6B35',
  },
  dusk: {
    name: 'Dusk',
    '--bg': '#1A1918',
    '--bg-panel': '#222120',
    '--bg-section': '#2A2826',
    '--accent': '#FF6B35',
    '--accent-dim': '#CC5528',
    '--text': '#E8E4DF',
    '--text-dim': '#807870',
    '--border': '#3A3733',
    '--key-white': '#D8D4CF',
    '--key-black': '#1A1714',
    '--key-active': '#FF6B35',
    '--knob-track': '#3A3733',
    '--knob-fill': '#FF6B35',
  },
  mint: {
    name: 'Mint',
    '--bg': '#E8F0ED',
    '--bg-panel': '#DCE8E3',
    '--bg-section': '#CFDDD8',
    '--accent': '#2DB87D',
    '--accent-dim': '#229960',
    '--text': '#1A2820',
    '--text-dim': '#5A7060',
    '--border': '#B8CEC8',
    '--key-white': '#F8FAFA',
    '--key-black': '#1A2820',
    '--key-active': '#2DB87D',
    '--knob-track': '#B8CEC8',
    '--knob-fill': '#2DB87D',
  },
  void: {
    name: 'Void',
    '--bg': '#0D0D0D',
    '--bg-panel': '#131313',
    '--bg-section': '#1A1A1A',
    '--accent': '#C8FF00',
    '--accent-dim': '#9ACC00',
    '--text': '#EFEFEF',
    '--text-dim': '#707070',
    '--border': '#2A2A2A',
    '--key-white': '#C8C8C8',
    '--key-black': '#0D0D0D',
    '--key-active': '#C8FF00',
    '--knob-track': '#2A2A2A',
    '--knob-fill': '#C8FF00',
  },
};

export function applyTheme(themeKey) {
  const theme = themes[themeKey];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    if (key.startsWith('--')) root.style.setProperty(key, value);
  });
}
