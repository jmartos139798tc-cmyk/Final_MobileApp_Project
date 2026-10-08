import React, { useState } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { isDesktop } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

// Import header component
import OwnerHeader from './components/OwnerHeader';

// Import screens
import OwnerDashboard from './screens/owner/OwnerDashboard';
import OwnerTenants from './screens/owner/OwnerTenants';
import OwnerRooms from './screens/owner/OwnerRooms';
import OwnerReports from './screens/owner/OwnerReports';
import OwnerBottomNav from './components/OwnerBottomNav';

export default function OwnerApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const { isDark, toggleTheme, colors } = useTheme();

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'dashboard':
        return 'Dashboard';
      case 'tenants':
        return 'Tenants';
      case 'rooms':
        return 'Rooms';
      case 'reports':
        return 'Reports';
      default:
        return 'Dashboard';
    }
  };

  const getScreenSubtitle = () => {
    // Only show date subtitle for Dashboard
    if (activeScreen === 'dashboard') {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return null;
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <OwnerDashboard />;
      case 'tenants':
        return <OwnerTenants />;
      case 'rooms':
        return <OwnerRooms />;
      case 'reports':
        return <OwnerReports />;
      default:
        return <OwnerDashboard />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.card} />

      {/* Unified Header */}
      <OwnerHeader
        title={getScreenTitle()}
        subtitle={getScreenSubtitle()}
        onLogout={onLogout}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <OwnerBottomNav user={user} activeScreen={activeScreen} onNavigate={setActiveScreen} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <OwnerBottomNav user={user} activeScreen={activeScreen} onNavigate={setActiveScreen} />
        </>
      )}
    </View>
  );
}
