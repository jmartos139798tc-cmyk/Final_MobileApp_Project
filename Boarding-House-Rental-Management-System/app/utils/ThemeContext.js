import React, { createContext, useContext, useState } from 'react';

// ─── Dark Palette (warm neutral) ─────────────────────────────────
const darkColors = {
  bg: '#1C1B19',
  card: '#262421',
  cardBorder: '#3A3732',

  text: '#F3F0EB',
  textSecondary: '#CFC9C0',
  textMuted: '#A39D94',

  // Brand / Accent (calm slate-teal)
  primary: '#3F5D6B',          // buttons, active tabs (use with onPrimary text)
  onPrimary: '#FFFFFF',
  accent: '#8FB3C4',
  accentBg: 'rgba(143, 179, 196, 0.14)',

  success: '#5FBF87',
  warning: '#E0A03A',
  danger: '#E5746C',
  info: '#6FA3C7',

  successBg: '#DCEFE3',
  successText: '#1F6B41',
  warningBg: '#F8E8C8',
  warningText: '#8A5200',
  dangerBg: '#F6DAD7',
  dangerText: '#9C2C25',
  infoBg: '#DCE8F1',
  infoText: '#245B80',

  iconBgBlue: 'rgba(111, 163, 199, 0.18)',
  iconBgRed: 'rgba(229, 116, 108, 0.18)',
  iconBgGreen: 'rgba(95, 191, 135, 0.18)',
  iconBgYellow: 'rgba(224, 160, 58, 0.18)',

  navBg: '#211F1D',
  navBorder: '#3A3732',
  navInactive: '#A39D94',
  sidebarBg: '#211F1D',
  sidebarBorder: '#3A3732',

  filterBg: '#262421',
  filterBorder: '#4A463F',
  searchBg: '#2B2926',
  searchBorder: '#4A463F',

  divider: '#3A3732',
  statusBarStyle: 'light-content',

  roomPaid: '#2B2926',
  roomBalance: '#3A3225',
  roomBalanceBorder: '#8B7355',
  roomVacant: '#262421',
  vacantBorder: '#4A463F',

  heroBg: '#3F5D6B',
  heroText: '#FFFFFF',
  heroSubtext: 'rgba(255,255,255,0.85)',
  heroBarBg: 'rgba(255,255,255,0.22)',
  heroBarFill: '#FFFFFF',

  toggleBg: '#262421',
  toggleBorder: '#4A463F',

  // Owner portal (same slate-teal family, no more purple)
  ownerAccent: '#8FB3C4',
  ownerAccentBg: 'rgba(143, 179, 196, 0.14)',
  ownerHero: '#3F5D6B',
  ownerHeroLight: '#5B7C8B',
  ownerIconBgPurple: 'rgba(143, 179, 196, 0.18)',
  ownerBarDefault: '#3A3732',
  ownerBarHighlight: '#8FB3C4',
};

// ─── Light Palette (warm neutral) ────────────────────────────────
const lightColors = {
  bg: '#F7F5F2',
  card: '#FFFFFF',
  cardBorder: '#E4E0DA',

  text: '#1F1D1A',
  textSecondary: '#4A4640',
  textMuted: '#6B665F',

  primary: '#3F5D6B',
  onPrimary: '#FFFFFF',
  accent: '#3F5D6B',
  accentBg: '#E6ECEF',

  success: '#2F7D4F',
  warning: '#B26A00',
  danger: '#B3372F',
  info: '#2F6E9A',

  successBg: '#DCEFE3',
  successText: '#1F6B41',
  warningBg: '#F8E8C8',
  warningText: '#8A5200',
  dangerBg: '#F6DAD7',
  dangerText: '#9C2C25',
  infoBg: '#DCE8F1',
  infoText: '#245B80',

  iconBgBlue: 'rgba(47, 110, 154, 0.12)',
  iconBgRed: 'rgba(179, 55, 47, 0.12)',
  iconBgGreen: 'rgba(47, 125, 79, 0.12)',
  iconBgYellow: 'rgba(178, 106, 0, 0.12)',

  navBg: '#FFFFFF',
  navBorder: '#E4E0DA',
  navInactive: '#6B665F',
  sidebarBg: '#FFFFFF',
  sidebarBorder: '#E4E0DA',

  filterBg: '#FFFFFF',
  filterBorder: '#CFC9C0',
  searchBg: '#FFFFFF',
  searchBorder: '#CFC9C0',

  divider: '#E4E0DA',
  statusBarStyle: 'dark-content',

  roomPaid: '#FFFFFF',
  roomBalance: '#FBF3E1',
  roomBalanceBorder: '#E0B96A',
  roomVacant: '#F2EFEA',
  vacantBorder: '#CFC9C0',

  heroBg: '#3F5D6B',
  heroText: '#FFFFFF',
  heroSubtext: 'rgba(255,255,255,0.85)',
  heroBarBg: 'rgba(255,255,255,0.22)',
  heroBarFill: '#FFFFFF',

  toggleBg: '#F2EFEA',
  toggleBorder: '#E4E0DA',

  ownerAccent: '#3F5D6B',
  ownerAccentBg: '#E6ECEF',
  ownerHero: '#3F5D6B',
  ownerHeroLight: '#5B7C8B',
  ownerIconBgPurple: '#E6ECEF',
  ownerBarDefault: '#E4E0DA',
  ownerBarHighlight: '#3F5D6B',
};

// ─── Context ─────────────────────────────────────────────────────
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Light is the default: easier to read for most users in daylight
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeContext');
  }
  return context;
}