import React, { useEffect, useState } from 'react';
import { BackHandler, View, StatusBar, TouchableOpacity, Platform, Modal, Pressable, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDesktop, isMobile, safeAreaTop, fs, spacing } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';

// Import header component
import LandlordHeader from './components/LandlordHeader';

// Import screens
import LandlordDashboard from './screens/landlord/LandlordDashboard';
import LandlordRooms from './screens/landlord/LandlordRooms';
import BillingScreen from './screens/landlord/BillingScreen';
import IssuesScreen from './screens/landlord/IssuesScreen';
import AnnouncementsScreen from './screens/landlord/AnnouncementsScreen';
import LandlordReports from './screens/landlord/LandlordReports';
import PendingApprovalsScreen from './screens/landlord/PendingApprovalsScreen';
import TenantFinancialManagement from './screens/landlord/TenantFinancialManagement';
import TenantDetailFinancial from './screens/landlord/TenantDetailFinancial';
import PaymentReviewScreen from './screens/landlord/PaymentReviewScreen';

// Import navigation
import LandlordBottomNav from './components/LandlordBottomNav';
import { getPendingTenantRegistrationCount, getPendingPaymentProofCount, getIssues } from './services/dataService';
import useRealtimeRefresh from './hooks/useRealtimeRefresh';

export default function LandlordApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [menuVisible, setMenuVisible] = useState(false);
  const [navigationParams, setNavigationParams] = useState(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [realtimeVersion, setRealtimeVersion] = useState(0);
  const { isDark, toggleTheme, colors } = useTheme();
  const menuTopInset = Platform.OS === 'ios'
    ? safeAreaTop
    : Platform.OS === 'android'
      ? StatusBar.currentHeight || 0
      : 0;
  const menuHeaderHeight = isMobile ? 56 : 64;

  useRealtimeRefresh('landlord-pending-approvals-badge', [
    { table: 'tenants' },
    { table: 'room_assignment_requests' },
    { table: 'complaints' },
    { table: 'payment_proofs' },
    { table: 'payments' },
  ], () => {
    setRealtimeVersion((version) => version + 1);
  });

  useEffect(() => {
    let isMounted = true;

    const refreshSignupCount = async () => {
      try {
        const [approvalCount, complaints, paymentCount] = await Promise.all([
          getPendingTenantRegistrationCount(),
          getIssues(),
          getPendingPaymentProofCount(),
        ]);
        if (isMounted) {
          setPendingApprovalsCount(approvalCount);
          setComplaintsCount(complaints.filter((complaint) => complaint.status !== 'resolved').length);
          setPendingPaymentCount(paymentCount);
        }
      } catch (error) {
        console.warn('Could not refresh landlord navigation badges:', error.message || error);
      }
    };

    refreshSignupCount();
    return () => {
      isMounted = false;
    };
  }, [realtimeVersion]);

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'dashboard':
        return 'Dashboard';
      case 'rooms':
        return 'Rooms';
      case 'billing':
        return 'Bills & Utilities';
      case 'complaints':
        return 'Complaints';
      case 'announcements':
        return 'Announcements';
      case 'reports':
        return 'Reports';
      case 'approvals':
        return 'Tenant Applications';
      case 'finances':
        return 'Tenant Finances';
      case 'tenant-detail':
        return 'Tenant Financial Details';
      case 'payment-review':
        return 'Payment Review';
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

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuVisible) {
        setMenuVisible(false);
        return true;
      }
      if (activeScreen === 'tenant-detail' || activeScreen === 'payment-review') {
        handleNavigate('finances', { filter: navigationParams?.returnFilter || 'all' });
        return true;
      }
      if (activeScreen !== 'dashboard') {
        handleNavigate('dashboard');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [activeScreen, menuVisible, navigationParams]);

  const renderScreen = () => {
    // Create navigation object for screens that need it
    const navigation = {
      navigate: (screen, params) => handleNavigate(screen, params),
      goBack: () => handleNavigate('finances', { filter: navigationParams?.returnFilter || 'all' }),
    };

    switch (activeScreen) {
      case 'dashboard':
        return <LandlordDashboard />;
      case 'rooms':
        return <LandlordRooms />;
      case 'billing':
        return <BillingScreen />;
      case 'complaints':
        return <IssuesScreen />;
      case 'announcements':
        return <AnnouncementsScreen />;
      case 'reports':
        return <LandlordReports />;
      case 'approvals':
        return <PendingApprovalsScreen />;
      case 'finances':
        return (
          <TenantFinancialManagement
            navigation={navigation}
            pendingPaymentCount={pendingPaymentCount}
            initialFilter={navigationParams?.filter || 'all'}
          />
        );
      case 'payment-review':
        return <PaymentReviewScreen user={user} navigation={navigation} />;
      case 'tenant-detail':
        return <TenantDetailFinancial route={{ params: navigationParams }} navigation={navigation} />;
      default:
        return <LandlordDashboard />;
    }
  };

  const openMenu = () => {
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const handleMenuNavigate = (screen) => {
    handleNavigate(screen);
    closeMenu();
  };

  const menuItems = [
    { id: 'rooms', label: 'Rooms', icon: 'bed', iconOutline: 'bed-outline' },
    { id: 'complaints', label: 'Complaints', icon: 'alert-circle', iconOutline: 'alert-circle-outline' },
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
        user={user}
        complaintsCount={complaintsCount}
      />

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <LandlordBottomNav activeScreen={activeScreen} onNavigate={handleNavigate} user={user} pendingApprovalsCount={pendingApprovalsCount} pendingPaymentCount={pendingPaymentCount} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          {activeScreen !== 'payment-review' && (
            <LandlordBottomNav activeScreen={activeScreen} onNavigate={handleNavigate} user={user} pendingApprovalsCount={pendingApprovalsCount} pendingPaymentCount={pendingPaymentCount} />
          )}
        </>
      )}

      <Modal visible={menuVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={closeMenu}>
        <View style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
            onPress={closeMenu}
          />
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: isMobile ? '68%' : 320, maxWidth: 360, zIndex: 2, elevation: 8, backgroundColor: colors.card, paddingTop: menuTopInset, paddingHorizontal: 16 }}>
            <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
              <View style={{ height: menuHeaderHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
                <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>Menu</Text>
                <TouchableOpacity onPress={closeMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {menuItems.map((item) => {
                  const isActive = activeScreen === item.id;
                  return (
                    <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => handleMenuNavigate(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6, backgroundColor: isActive ? colors.accentBg : 'transparent' }}>
                      <View style={{ position: 'relative' }}>
                        <Ionicons name={isActive ? item.icon : item.iconOutline} size={22} color={isActive ? colors.accent : colors.textSecondary} />
                      </View>
                      <Text numberOfLines={1} style={{ flex: 1, flexShrink: 1, fontSize: fs(15), fontWeight: isActive ? '700' : '500', color: isActive ? colors.accent : colors.text }}>{item.label}</Text>
                      {item.id === 'complaints' && complaintsCount > 0 && (
                        <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.dangerText, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{complaintsCount > 99 ? '99+' : complaintsCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
