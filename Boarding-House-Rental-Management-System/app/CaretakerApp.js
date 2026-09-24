import React, { useState } from 'react';
import { View, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, isMobile, safeAreaTop, cardShadow } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

// Import all screens
import CaretakerDashboard from './screens/CaretakerDashboard';
import RoomsScreen from './screens/RoomsScreen';
import TenantsScreen from './screens/TenantsScreen';
import BillingScreen from './screens/BillingScreen';
import IssuesScreen from './screens/IssuesScreen';
import AnnouncementsScreen from './screens/AnnouncementsScreen';
import RoomChangeRequestsScreen from './screens/RoomChangeRequestsScreen';

// Import navigation
import BottomNav from './components/BottomNav';

export default function CaretakerApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home');
  const { isDark, toggleTheme, colors } = useTheme();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <CaretakerDashboard />;
      case 'rooms':
        return <RoomsScreen />;
      case 'tenants':
        return <TenantsScreen />;
      case 'billing':
        return <BillingScreen />;
      case 'issues':
        return <IssuesScreen />;
      case 'room-changes':
        return <RoomChangeRequestsScreen />;
      case 'announce':
        return <AnnouncementsScreen />;
      default:
        return <CaretakerDashboard />;
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
          <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
        </>
      )}
    </View>
  );
}
