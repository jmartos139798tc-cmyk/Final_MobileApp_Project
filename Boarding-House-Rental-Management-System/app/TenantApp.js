import React, { useState } from 'react';
import { View, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, isMobile, safeAreaTop, cardShadow } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

import TenantHomeScreen from './screens/tenant/TenantHomeScreen';
import TenantComplaintsScreen from './screens/tenant/TenantComplaintsScreen';
import TenantUpdatesScreen from './screens/tenant/TenantUpdatesScreen';
import TenantRoomChangeScreen from './screens/tenant/TenantRoomChangeScreen';
import TenantBottomNav from './components/TenantBottomNav';

export default function TenantApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home');
  const { isDark, toggleTheme, colors } = useTheme();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <TenantHomeScreen onNavigateToUpdates={() => setActiveScreen('updates')} />;
      case 'complaints':
        return <TenantComplaintsScreen />;
      case 'updates':
        return <TenantUpdatesScreen />;
      case 'room-change':
        return <TenantRoomChangeScreen />;
      default:
        return <TenantHomeScreen onNavigateToUpdates={() => setActiveScreen('updates')} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      {/* Floating theme toggle */}
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
          <TenantBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <TenantBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
        </>
      )}
    </View>
  );
}

