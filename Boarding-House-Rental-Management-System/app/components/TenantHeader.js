import React from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal, Platform, StatusBar, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { isMobile, isDesktop, fs, spacing, safeAreaTop } from '../utils/responsive';

/**
 * TenantHeader - Unified header component for Tenant screens
 * 
 * Features:
 * - Screen title and subtitle/date (left)
 * - Theme toggle and logout buttons (right)
 * - Proper safe area handling
 * - Consistent spacing and touch targets
 */
export default function TenantHeader({ 
  title = 'Home',
  subtitle = null,
  onLogout,
  onBackPress,
  notificationCount = 0,
  notificationItems = [],
  onNotificationRead,
  onNotificationsPress,
  onSettingsPress,
  isDark,
  onThemeToggle,
}) {
  const { colors } = useTheme();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationDetailVisible, setNotificationDetailVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [logoutConfirmationVisible, setLogoutConfirmationVisible] = useState(false);

  const topInset =
  Platform.OS === 'ios'
    ? safeAreaTop
    : Platform.OS === 'android'
    ? StatusBar.currentHeight || 0
    : 0;

  const headerHeight = isMobile ? 56 : 64;
  const buttonSize = 40;
  const iconSize = 22;
  const formatNotificationTime = (value) => {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return '';
    const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBorder,
        paddingTop: topInset,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          android: {
            elevation: 2,
          },
          web: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        }),
      }}
    >
      <View
        style={{
          height: headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        {/* Left Section: Back button and title */}
        {onBackPress && (
          <TouchableOpacity
            onPress={onBackPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
            style={{ width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: fs(20),
              fontWeight: '800',
              color: colors.text,
              lineHeight: fs(24),
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: fs(12),
                fontWeight: '500',
                color: colors.textMuted,
                lineHeight: fs(16),
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Profile menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={onThemeToggle}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={19} color={isDark ? '#fbbf24' : colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSelectedNotification(null);
              setNotificationsVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Open notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
            accessibilityState={{ expanded: notificationsVisible }}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={notificationsVisible ? 'notifications' : 'notifications-outline'} size={21} color={colors.textSecondary} />
            {notificationCount > 0 && (
              <View style={{ position: 'absolute', top: 1, right: 1, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: colors.dangerText, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.card }}>
                <Text style={{ color: '#fff', fontSize: 9, lineHeight: 11, fontWeight: '800' }}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setProfileMenuVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open profile menu"
            accessibilityState={{ expanded: profileMenuVisible }}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person-circle-outline" size={25} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'flex-end', paddingTop: topInset + headerHeight + 6, paddingHorizontal: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close notifications"
            onPress={() => setNotificationsVisible(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.18)' }}
          />
          <View style={{
            width: isMobile ? '100%' : 360,
            maxWidth: 400,
            maxHeight: 420,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
              android: { elevation: 8 },
              web: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)' },
            }),
          }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Notifications</Text>
              {notificationCount > 0 && <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700' }}>{notificationCount} new</Text>}
            </View>
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
              {notificationItems.length === 0 ? (
                <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingVertical: 28 }}>
                  <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>You’re all caught up</Text>
                </View>
              ) : notificationItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id || `${item.title}-${index}`}
                  activeOpacity={0.75}
                  onPress={() => {
                    onNotificationRead?.(item);
                    setSelectedNotification(item);
                    setNotificationsVisible(false);
                    setNotificationDetailVisible(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: index < notificationItems.length - 1 ? 1 : 0, borderBottomColor: colors.cardBorder, backgroundColor: item.read ? colors.card : colors.accentBg }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: item.type === 'announcement' ? colors.successBg : colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={item.type === 'announcement' ? 'megaphone-outline' : 'notifications-outline'} size={17} color={item.type === 'announcement' ? colors.successText : colors.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: item.read ? '600' : '800' }}>{item.title || 'Notification'}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{formatNotificationTime(item.created_at)}</Text>
                    </View>
                    {!!item.message && <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 }}>{item.message}</Text>}
                  </View>
                  {!item.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 5 }} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => {
                setNotificationsVisible(false);
                onNotificationsPress?.();
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              style={{ paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.cardBorder }}
            >
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>View all notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={notificationDetailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationDetailVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.42)' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close notification details"
            onPress={() => setNotificationDetailVisible(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View style={{
            width: '100%',
            maxWidth: 380,
            minHeight: 300,
            maxHeight: '80%',
            borderRadius: 22,
            padding: 22,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 },
              android: { elevation: 10 },
              web: { boxShadow: '0 18px 44px rgba(15, 23, 42, 0.25)' },
            }),
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>NOTIFICATION DETAILS</Text>
              <TouchableOpacity
                onPress={() => setNotificationDetailVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close notification details"
                hitSlop={8}
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}
              >
                <Ionicons name="close" size={21} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedNotification && (
              <>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: selectedNotification.type === 'announcement' ? colors.successBg : colors.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Ionicons name={selectedNotification.type === 'announcement' ? 'megaphone-outline' : 'notifications-outline'} size={25} color={selectedNotification.type === 'announcement' ? colors.successText : colors.accent} />
                </View>
                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: '800' }}>{selectedNotification.title || 'Notification'}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>{formatNotificationTime(selectedNotification.created_at)}</Text>
                  {!!selectedNotification.message && <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 18 }}>{selectedNotification.message}</Text>}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={profileMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'flex-end', paddingTop: topInset + headerHeight + 6, paddingHorizontal: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close profile menu"
            onPress={() => setProfileMenuVisible(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.18)' }}
          />
          <View style={{
            width: 248,
            borderRadius: 16,
            padding: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
              android: { elevation: 8 },
              web: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)' },
            }),
          }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, textTransform: 'uppercase' }}>
              Profile
            </Text>

            <TouchableOpacity
              onPress={() => {
                setProfileMenuVisible(false);
                onSettingsPress?.();
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 11 }}
            >
              <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
              <Text style={{ flex: 1, marginLeft: 12, color: colors.text, fontSize: 14, fontWeight: '600' }}>Settings</Text>
            </TouchableOpacity>

            {onLogout && (
              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  setLogoutConfirmationVisible(true);
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 11, marginTop: 2 }}
              >
                <Ionicons name="log-out-outline" size={19} color={colors.danger} />
                <Text style={{ marginLeft: 12, color: colors.danger, fontSize: 14, fontWeight: '600' }}>Log out</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={logoutConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmationVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.42)' }}>
          <View style={{
            width: '100%',
            maxWidth: 360,
            padding: 22,
            borderRadius: 18,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
              android: { elevation: 8 },
              web: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)' },
            }),
          }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="log-out-outline" size={22} color={colors.dangerText} />
            </View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Log out?</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 7 }}>
              Are you sure you want to log out of your tenant account?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <TouchableOpacity
                onPress={() => setLogoutConfirmationVisible(false)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Cancel logout"
                style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.bg }}
              >
                <Text style={{ color: '#4A4640', fontSize: 14, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setLogoutConfirmationVisible(false);
                  onLogout?.();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Confirm logout"
                style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.dangerText }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
