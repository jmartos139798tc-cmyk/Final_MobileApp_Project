import React, { useState } from 'react';
import { View, StatusBar, TouchableOpacity, Platform, Modal, Pressable, Text, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, isMobile, safeAreaTop, fs, spacing } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

// Import header component
import LandlordHeader from './components/LandlordHeader';

// Import screens
import LandlordDashboard from './screens/landlord/LandlordDashboard';
import LandlordTenants from './screens/landlord/LandlordTenants';
import LandlordRooms from './screens/landlord/LandlordRooms';
import BillingScreen from './screens/landlord/BillingScreen';
import IssuesScreen from './screens/landlord/IssuesScreen';
import AnnouncementsScreen from './screens/landlord/AnnouncementsScreen';
import LandlordReports from './screens/landlord/LandlordReports';
import PendingApprovalsScreen from './screens/landlord/PendingApprovalsScreen';
import TenantFinancialManagement from './screens/landlord/TenantFinancialManagement';
import TenantDetailFinancial from './screens/landlord/TenantDetailFinancial';
import PaymentProofReviewScreen from './screens/landlord/PaymentProofReviewScreen';

// Import navigation
import LandlordBottomNav from './components/LandlordBottomNav';

export default function LandlordApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-280));
  const [navigationParams, setNavigationParams] = useState(null);
  const { isDark, toggleTheme, colors } = useTheme();

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'dashboard':
        return 'Dashboard';
      case 'tenants':
        return 'Tenants';
      case 'rooms':
        return 'Rooms';
      case 'billing':
        return 'Billing';
      case 'issues':
        return 'Issues';
      case 'announcements':
        return 'Announcements';
      case 'reports':
        return 'Reports';
      case 'approvals':
        return 'Pending Approvals';
      case 'finances':
        return 'Tenant Finances';
      case 'tenant-detail':
        return 'Tenant Financial Details';
      case 'payment-proofs':
        return 'Payment Verification';
      default:
        return 'Dashboard';
    }
  };

  const getScreenSubtitle = () => {
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

  const handleNavigate = (screen, params = null) => {
    setActiveScreen(screen);
    setNavigationParams(params);
  };

  const renderScreen = () => {
    // Create navigation object for screens that need it
    const navigation = {
      navigate: (screen, params) => handleNavigate(screen, params),
      goBack: () => handleNavigate('finances'),
    };

    switch (activeScreen) {
      case 'dashboard':
        return <LandlordDashboard />;
      case 'tenants':
        return <LandlordTenants />;
      case 'rooms':
        return <LandlordRooms />;
      case 'billing':
        return <BillingScreen />;
      case 'issues':
        return <IssuesScreen />;
      case 'announcements':
        return <AnnouncementsScreen />;
      case 'reports':
        return <LandlordReports />;
      case 'approvals':
        return <PendingApprovalsScreen />;
      case 'finances':
        return <TenantFinancialManagement navigation={navigation} />;
      case 'tenant-detail':
        return <TenantDetailFinancial route={{ params: navigationParams }} navigation={navigation} />;
      case 'payment-proofs':
        return <PaymentProofReviewScreen />;
      default:
        return <LandlordDashboard />;
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
    { id: 'payment-proofs', label: 'Payment Verification', icon: 'checkmark-done', iconOutline: 'checkmark-done-outline' },
    { id: 'billing', label: 'Billing', icon: 'card', iconOutline: 'card-outline' },
    { id: 'issues', label: 'Issues', icon: 'alert-circle', iconOutline: 'alert-circle-outline' },
    { id: 'announcements', label: 'Announcements', icon: 'megaphone', iconOutline: 'megaphone-outline' },
    { id: 'reports', label: 'Reports', icon: 'bar-chart', iconOutline: 'bar-chart-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.card} />

      <LandlordHeader
        title={getScreenTitle()}
        subtitle={getScreenSubtitle()}
        onMenuPress={openMenu}
        onLogout={onLogout}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <LandlordBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} user={user} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <LandlordBottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} user={user} />
        </>
      )}

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={closeMenu}>
          <Animated.View style={{ width: 280, height: '100%', backgroundColor: colors.card, paddingTop: Platform.OS === 'ios' ? safeAreaTop + 20 : 20, paddingHorizontal: 16, transform: [{ translateX: slideAnim }] }}>
            <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
                <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>Menu</Text>
                <TouchableOpacity onPress={closeMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {menuItems.map((item) => {
                  const isActive = activeScreen === item.id;
                  return (
                    <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => handleMenuNavigate(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 6, backgroundColor: isActive ? colors.accentBg : 'transparent' }}>
                      <Ionicons name={isActive ? item.icon : item.iconOutline} size={22} color={isActive ? colors.accent : colors.textSecondary} />
                      <Text style={{ fontSize: fs(15), fontWeight: isActive ? '700' : '500', color: isActive ? colors.accent : colors.text }}>{item.label}</Text>
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
