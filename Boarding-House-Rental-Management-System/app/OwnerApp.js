import React, { useState } from 'react';
import { View, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, isMobile, safeAreaTop, cardShadow } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

import OwnerDashboard from './screens/owner/OwnerDashboard';
import OwnerReports from './screens/owner/OwnerReports';
import OwnerBottomNav from './components/OwnerBottomNav';

export default function OwnerApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const { isDark, toggleTheme, colors } = useTheme();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <OwnerDashboard />;
      case 'reports':
        return <OwnerReports />;
      default:
        return <OwnerDashboard />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      {/* Theme toggle */}
      <TouchableOpacity
        onPress={toggleTheme}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          top: isMobile ? safeAreaTop + 8 : 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          ...cardShadow,
        }}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={isDark ? '#fbbf24' : '#6366f1'} />
      </TouchableOpacity>

      {/* Log out button */}
      {onLogout && (
        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.7}
          style={{
            position: 'absolute',
            top: isMobile ? safeAreaTop + 8 : 16,
            right: 64,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            ...cardShadow,
          }}
        >
          <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        </TouchableOpacity>
      )}

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <OwnerBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <OwnerBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
        </>
      )}
    </View>
  );
}

