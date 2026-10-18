import React, { useState, useEffect } from 'react';
import { BackHandler, View, StatusBar, Platform } from 'react-native';
import { isDesktop } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';
import { getAnnouncements, getCurrentTenant, getTenantNotifications, markNotificationAsRead } from './services/dataService';
import { getLastSeen, getAnnouncementTime, markAnnouncementsSeen } from './utils/announcementSeen';
import useRealtimeRefresh from './hooks/useRealtimeRefresh';

// Import header component
import TenantHeader from './components/TenantHeader';

// Import screens
import TenantHomeScreen from './screens/tenant/TenantHomeScreen';
import TenantComplaintsScreen from './screens/tenant/TenantComplaintsScreen';
import TenantUpdatesScreen from './screens/tenant/TenantUpdatesScreen';
import TenantFinancesScreen from './screens/tenant/TenantFinancesScreen';
import TenantNotificationsScreen from './screens/tenant/TenantNotificationsScreen';
import TenantSettingsScreen from './screens/tenant/TenantSettingsScreen';
import TenantApplicationScreen from './screens/tenant/TenantApplicationScreen';
import TenantBottomNav from './components/TenantBottomNav';

export default function TenantApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home');
  const [tenantUser, setTenantUser] = useState(user);
  const { isDark, toggleTheme, colors } = useTheme();

  const [notificationBadge, setNotificationBadge] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [tenantAccountStatus, setTenantAccountStatus] = useState(null);
  const [realtimeVersion, setRealtimeVersion] = useState(0);

  useEffect(() => setTenantUser(user), [user]);

  useEffect(() => {
    let active = true;
    if (!tenantUser?.tenant_id) {
      setTenantAccountStatus(null);
      return () => { active = false; };
    }
    getCurrentTenant(tenantUser.tenant_id)
      .then((tenant) => {
        if (active) setTenantAccountStatus(tenant?.accountStatus || 'pending');
      })
      .catch(() => {
        if (active) setTenantAccountStatus(null);
      });
    return () => { active = false; };
  }, [tenantUser?.tenant_id, realtimeVersion]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeScreen === 'home') return false;
      setActiveScreen('home');
      return true;
    });
    return () => subscription.remove();
  }, [activeScreen]);

  useRealtimeRefresh(`tenant-badge-${tenantUser?.tenant_id || 'unknown'}`, [
    { table: 'tenant_notifications', filter: `tenant_id=eq.${tenantUser?.tenant_id || ''}` },
    { table: 'announcements' },
  ], () => setRealtimeVersion((version) => version + 1), Boolean(tenantUser?.tenant_id));

  useEffect(() => {
    let active = true;
    const refreshBadge = async () => {
      if (activeScreen === 'notifications') {
        setNotificationBadge(0);
        return;
      }
      try {
        const uid = tenantUser?.uid || tenantUser?.tenant_id;
        const tenantId = tenantUser?.tenant_id || tenantUser?.room || '2';
        const [announcements, notifications, lastSeen] = await Promise.all([
          getAnnouncements().catch(() => []),
          getTenantNotifications(tenantId).catch(() => []),
          getLastSeen(uid),
        ]);
        const announcementItems = (announcements || []).map((item) => ({
          id: `announcement-${item.announcement_id || item.id}`,
          type: 'announcement',
          title: item.title || 'Property update',
          message: item.description || '',
          created_at: new Date(getAnnouncementTime(item)).toISOString(),
          read: getAnnouncementTime(item) <= lastSeen,
          announcement: item,
        }));
        const latestItems = [...(notifications || []), ...announcementItems]
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          .slice(0, 5);
        const newAnnouncements = announcementItems.filter((a) => !a.read).length;
        const unreadNotifications = (notifications || []).filter((n) => !n.read).length;
        if (active) {
          setNotificationBadge(newAnnouncements + unreadNotifications);
          setNotificationItems(latestItems);
        }
      } catch {
        if (active) {
          setNotificationBadge(0);
          setNotificationItems([]);
        }
      }
    };
    refreshBadge();
    return () => {
      active = false;
    };
  }, [activeScreen, tenantUser?.uid, tenantUser?.tenant_id, realtimeVersion]);

  const handleNotificationRead = async (item) => {
    if (!item || item.read) return;
    setNotificationItems((current) => current.map((notification) => (
      notification.id === item.id ? { ...notification, read: true } : notification
    )));
    setNotificationBadge((count) => Math.max(0, count - 1));
    try {
      if (item.type === 'announcement') {
        await markAnnouncementsSeen(tenantUser?.uid || tenantUser?.tenant_id, [item.announcement || item]);
      } else {
        await markNotificationAsRead(item.id);
      }
    } catch (error) {
      console.error('Could not save notification read state:', error);
    }
  };

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'home':
        return 'Home';
      case 'complaints':
        return 'Complaints';
      case 'updates':
        return 'Updates';
      case 'finances':
        return 'My Finances';
      case 'application':
        return tenantAccountStatus === 'approved' ? 'Room & Application Details' : 'Application Setup';
      case 'notifications':
        return 'Notifications';
      case 'settings':
        return 'Settings';
      default:
        return 'Home';
    }
  };

  const getScreenSubtitle = () => {
    // Show date subtitle for Home screen
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
        return <TenantHomeScreen user={tenantUser} onNavigateToNotifications={() => setActiveScreen('notifications')} onNavigateToApplication={() => setActiveScreen('application')} />;
      case 'complaints':
        return <TenantComplaintsScreen user={tenantUser} />;
      case 'updates':
        return <TenantUpdatesScreen />;
      case 'finances':
        return <TenantFinancesScreen user={tenantUser} onNavigateToApplication={() => setActiveScreen('application')} />;
      case 'application':
        return <TenantApplicationScreen user={tenantUser} />;
      case 'notifications':
        return <TenantNotificationsScreen user={tenantUser} />;
      case 'settings':
        return <TenantSettingsScreen
          user={tenantUser}
          onBack={() => setActiveScreen('home')}
          onUserUpdated={(updates) => setTenantUser((current) => ({ ...current, ...updates }))}
        />;
      default:
        return <TenantHomeScreen user={tenantUser} onNavigateToNotifications={() => setActiveScreen('notifications')} onNavigateToApplication={() => setActiveScreen('application')} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.card} />

      {/* Unified Header */}
      <TenantHeader
        title={getScreenTitle()}
        subtitle={getScreenSubtitle()}
        onLogout={onLogout}
        onBackPress={activeScreen === 'application' ? () => setActiveScreen('home') : undefined}
        notificationCount={notificationBadge}
        notificationItems={notificationItems}
        onNotificationRead={handleNotificationRead}
        onNotificationsPress={() => setActiveScreen('notifications')}
        onSettingsPress={() => setActiveScreen('settings')}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {activeScreen !== 'application' && <TenantBottomNav user={tenantUser} activeScreen={activeScreen} onNavigate={setActiveScreen} />}
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          {activeScreen !== 'application' && <TenantBottomNav user={tenantUser} activeScreen={activeScreen} onNavigate={setActiveScreen} />}
        </>
      )}
    </View>
  );
}
