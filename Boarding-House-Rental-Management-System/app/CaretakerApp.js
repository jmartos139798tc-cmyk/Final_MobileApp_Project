import React, { useState } from 'react';
import { View, StatusBar, Platform, Modal, Pressable, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, isMobile, safeAreaTop, cardShadow, fs, spacing } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

// Import header component
import CaretakerHeader from './components/CaretakerHeader';

// Import all screens
import CaretakerDashboard from './screens/CaretakerDashboard';
import RoomsScreen from './screens/RoomsScreen';
import TenantsScreen from './screens/TenantsScreen';
import BillingScreen from './screens/BillingScreen';
import IssuesScreen from './screens/IssuesScreen';
import AnnouncementsScreen from './screens/AnnouncementsScreen';

// Import navigation
import BottomNav from './components/CaretakerBottomNav';

export default function CaretakerApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home');
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-280)); // Start off-screen to the left
  const { isDark, toggleTheme, colors } = useTheme();

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'home':
        return 'Dashboard';
      case 'rooms':
        return 'Rooms';
      case 'tenants':
        return 'Tenants';
      case 'billing':
        return 'Billing';
      case 'issues':
        return 'Issues';
      case 'announce':
        return 'Announcements';
      default:
        return 'Dashboard';
    }
  };

  const getScreenSubtitle = () => {
    // Only show date subtitle for Dashboard
    if (activeScreen === 'home') {
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
      case 'announce':
        return <AnnouncementsScreen />;
      default:
        return <CaretakerDashboard />;
    }
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -280,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
    });
  };

  const handleMenuNavigate = (screen) => {
    setActiveScreen(screen);
    closeMenu();
  };

  const menuItems = [
    { id: 'issues', label: 'Issues', icon: 'chatbubble-ellipses', iconOutline: 'chatbubble-ellipses-outline' },
    { id: 'announce', label: 'Announcements', icon: 'megaphone', iconOutline: 'megaphone-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.card} />

      {/* Unified Header */}
      <CaretakerHeader
        title={getScreenTitle()}
        subtitle={getScreenSubtitle()}
        onMenuPress={openMenu}
        onLogout={onLogout}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

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

      {/* Hamburger Menu Drawer */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onPress={closeMenu}
        >
          <Animated.View
            style={{
              width: 280,
              height: '100%',
              backgroundColor: colors.card,
              paddingTop: Platform.OS === 'ios' ? safeAreaTop + 20 : 20,
              paddingHorizontal: 16,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <Pressable
              style={{ flex: 1 }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
                <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>Menu</Text>
                <TouchableOpacity
                  onPress={closeMenu}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {menuItems.map((item) => {
                  const isActive = activeScreen === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => handleMenuNavigate(item.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 14,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        overflow: 'hidden',
                        marginBottom: 6,
                        backgroundColor: isActive ? colors.accentBg : 'transparent',
                      }}
                    >
                      <Ionicons
                        name={isActive ? item.icon : item.iconOutline}
                        size={22}
                        color={isActive ? colors.accent : colors.textSecondary}
                      />
                      <Text style={{
                        fontSize: fs(15),
                        fontWeight: isActive ? '700' : '500',
                        color: isActive ? colors.accent : colors.text,
                      }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}
