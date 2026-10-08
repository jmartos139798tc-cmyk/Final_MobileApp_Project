import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getTenantNotifications, markNotificationAsRead } from '../../services/dataService';

export default function TenantNotificationsScreen({ user }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    try {
      setError(null);
      const tenantId = user?.tenant_id || user?.room || '2';
      const data = await getTenantNotifications(tenantId);
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [user]);

  const handleNotificationPress = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'approval':
        return { name: 'checkmark-circle', color: colors.successText, bg: colors.successBg };
      case 'rejection':
        return { name: 'close-circle', color: colors.dangerText, bg: colors.dangerBg };
      case 'invoice_created':
        return { name: 'document-text', color: '#f59e0b', bg: '#fef3c7' };
      case 'payment_recorded':
        return { name: 'cash', color: colors.successText, bg: colors.successBg };
      default:
        return { name: 'notifications', color: colors.accent, bg: colors.accentBg };
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const groupNotificationsByDate = (notifs) => {
    const groups = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifs.forEach((notif) => {
      const notifDate = new Date(notif.created_at);
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

      let groupKey;
      if (notifDay.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else if (now - notifDay < 7 * 86400000) {
        groupKey = 'This Week';
      } else {
        groupKey = 'Older';
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(notif);
    });

    return groups;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 12 }}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: isMobile ? safeAreaTop + 16 : 40, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '700' }}>Notifications</Text>
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: colors.dangerText,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#fff' }}>{unreadCount} New</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 4 }}>Stay updated on your account</Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={{ ...cardStyle, backgroundColor: colors.dangerBg, borderColor: colors.dangerText, padding: 16, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color={colors.dangerText} />
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600', flex: 1 }}>{error}</Text>
            </View>
          </View>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 48, alignItems: 'center' }}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginTop: 16 }}>No Notifications</Text>
            <Text style={{ fontSize: fs(14), color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          <View>
            {Object.entries(groupNotificationsByDate(notifications)).map(([groupName, groupNotifs]) => (
              <View key={groupName} style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>
                  {groupName}
                </Text>

                <View style={{ gap: spacing.sm }}>
                  {groupNotifs.map((notification) => {
                    const iconData = getNotificationIcon(notification.type);

                    return (
                      <TouchableOpacity
                        key={notification.id}
                        activeOpacity={0.7}
                        onPress={() => handleNotificationPress(notification)}
                        style={{
                          ...cardStyle,
                          backgroundColor: notification.read ? colors.card : colors.accentBg,
                          borderColor: notification.read ? colors.cardBorder : colors.accent,
                          borderWidth: notification.read ? 1 : 2,
                          padding: 16,
                        }}
                      >
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          {/* Icon */}
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              backgroundColor: iconData.bg,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Ionicons name={iconData.name} size={22} color={iconData.color} />
                          </View>

                          {/* Content */}
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <Text
                                style={{
                                  fontSize: fs(15),
                                  fontWeight: '700',
                                  color: colors.text,
                                  flex: 1,
                                  marginRight: 8,
                                }}
                              >
                                {notification.title}
                              </Text>
                              {!notification.read && (
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: colors.accent,
                                  }}
                                />
                              )}
                            </View>

                            <Text
                              style={{
                                fontSize: fs(14),
                                color: colors.textSecondary,
                                lineHeight: 20,
                                marginBottom: 8,
                              }}
                            >
                              {notification.message}
                            </Text>

                            <Text style={{ fontSize: fs(12), color: colors.textMuted }}>
                              {formatDate(notification.created_at)}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
