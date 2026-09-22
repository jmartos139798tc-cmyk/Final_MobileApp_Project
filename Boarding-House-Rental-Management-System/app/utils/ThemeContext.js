import React, { createContext, useContext, useState } from 'react';

// ─── Dark Palette ────────────────────────────────────────────────
const darkColors = {
  // Base surfaces
  bg: '#0f172a',
  card: '#1e293b',
  cardBorder: '#283548',

  // Text
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Brand / Accent
  accent: '#ff6347',
  accentBg: 'rgba(255, 99, 71, 0.12)',

  // Status
  success: '#10b981',
  warning: '#fbbf24',
  danger: '#ef4444',
  info: '#3b82f6',

  // Badge / pill backgrounds (light tint + dark text)
  successBg: '#d1fae5',
  successText: '#059669',
  warningBg: '#fef3c7',
  warningText: '#d97706',
  dangerBg: '#fee2e2',
  dangerText: '#dc2626',
  infoBg: '#dbeafe',
  infoText: '#0284c7',

  // Icon badge backgrounds (15% opacity tints)
  iconBgBlue: 'rgba(59, 130, 246, 0.15)',
  iconBgRed: 'rgba(239, 68, 68, 0.15)',
  iconBgGreen: 'rgba(16, 185, 129, 0.15)',
  iconBgYellow: 'rgba(251, 191, 36, 0.15)',

  // Navigation
  navBg: '#0f172a',
  navBorder: '#1e293b',
  navInactive: '#64748b',
  sidebarBg: '#1e293b',
  sidebarBorder: '#334155',

  // Controls
  filterBg: '#1e293b',
  filterBorder: '#334155',
  searchBg: '#1e293b',
  searchBorder: '#334155',

  // Misc
  divider: '#334155',
  statusBarStyle: 'light-content',

  // Room card variants
  roomPaid: '#2d3748',
  roomBalance: '#4a3f28',
  roomBalanceBorder: '#8b7355',
  roomVacant: '#1e293b',
  vacantBorder: '#475569',

  // Occupancy hero card (stays the same both themes)
  heroBg: '#ff6347',
  heroText: '#ffffff',
  heroSubtext: 'rgba(255,255,255,0.8)',
  heroBarBg: 'rgba(255,255,255,0.2)',
  heroBarFill: '#ffffff',

  // Toggle component
  toggleBg: '#1e293b',
  toggleBorder: '#334155',

  // Owner accent (purple — used in Owner portal)
  ownerAccent: '#7c3aed',
  ownerAccentBg: 'rgba(124, 58, 237, 0.12)',
  ownerHero: '#4c1d95',
  ownerHeroLight: '#7c3aed',
  ownerIconBgPurple: 'rgba(124, 58, 237, 0.15)',
  ownerBarDefault: '#334155',
  ownerBarHighlight: '#7c3aed',
};

// ─── Light Palette ───────────────────────────────────────────────
const lightColors = {
  bg: '#f1f5f9',
  card: '#ffffff',
  cardBorder: '#e2e8f0',

  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  accent: '#ff6347',
  accentBg: 'rgba(255, 99, 71, 0.08)',

  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  successBg: '#d1fae5',
  successText: '#059669',
  warningBg: '#fef3c7',
  warningText: '#92400e',
  dangerBg: '#fee2e2',
  dangerText: '#dc2626',
  infoBg: '#dbeafe',
  infoText: '#0284c7',

  iconBgBlue: 'rgba(59, 130, 246, 0.1)',
  iconBgRed: 'rgba(239, 68, 68, 0.1)',
  iconBgGreen: 'rgba(16, 185, 129, 0.1)',
  iconBgYellow: 'rgba(251, 191, 36, 0.1)',

  navBg: '#ffffff',
  navBorder: '#e2e8f0',
  navInactive: '#94a3b8',
  sidebarBg: '#ffffff',
  sidebarBorder: '#e2e8f0',

  filterBg: '#ffffff',
  filterBorder: '#e2e8f0',
  searchBg: '#f8fafc',
  searchBorder: '#e2e8f0',

  divider: '#e2e8f0',
  statusBarStyle: 'dark-content',

  roomPaid: '#ffffff',
  roomBalance: '#fffbeb',
  roomBalanceBorder: '#fcd34d',
  roomVacant: '#f8fafc',
  vacantBorder: '#cbd5e1',

  heroBg: '#ff6347',
  heroText: '#ffffff',
  heroSubtext: 'rgba(255,255,255,0.8)',
  heroBarBg: 'rgba(255,255,255,0.2)',
  heroBarFill: '#ffffff',

  toggleBg: '#f1f5f9',
  toggleBorder: '#e2e8f0',

  // Owner accent (purple)
  ownerAccent: '#7c3aed',
  ownerAccentBg: 'rgba(124, 58, 237, 0.08)',
  ownerHero: '#6d28d9',
  ownerHeroLight: '#8b5cf6',
  ownerIconBgPurple: 'rgba(124, 58, 237, 0.1)',
  ownerBarDefault: '#e2e8f0',
  ownerBarHighlight: '#7c3aed',
};

// ─── Context ─────────────────────────────────────────────────────
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

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
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

