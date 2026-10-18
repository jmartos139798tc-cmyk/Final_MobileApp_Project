import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getTenantNotifications, markNotificationAsRead, dismissTenantNotification, deleteResolvedTenantComplaint, getAnnouncements } from '../../services/dataService';
import AnnouncementDetailsModal from '../../components/AnnouncementDetailsModal';
import { getLastSeen, markAnnouncementsSeen, getAnnouncementTime, getDismissedAnnouncementIds, dismissAnnouncement } from '../../utils/announcementSeen';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const timeOf = (item) => {
  const parsed = Date.parse(item.created_at);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function TenantNotificationsScreen({ user }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const tenantId = user?.tenant_id || user?.room || '2';

  const loadNotifications = async () => {
    try {
      setError(null);
      const uid = user?.uid || user?.tenant_id;
      const [data, announcements, lastSeen, dismissedAnnouncementIds] = await Promise.all([
        getTenantNotifications(tenantId),
        getAnnouncements().catch(() => []),
        getLastSeen(uid),
        getDismissedAnnouncementIds(uid),
      ]);
      const announcementItems = (announcements || []).map((announcement) => {
        const time = getAnnouncementTime(announcement);
        return {
          id: `announcement-${announcement.announcement_id || announcement.id}`,
          type: 'announcement',
          category: announcement.category,
          title: announcement.title,
          message: announcement.description,
          created_at: new Date(time).toISOString(),
          read: time <= lastSeen,
          announcement,
        };
      });
      const visibleAnnouncements = announcementItems.filter((item) => !dismissedAnnouncementIds.includes(item.id));
      setNotifications([...(data || []), ...visibleAnnouncements].sort((a, b) => timeOf(b) - timeOf(a)));
      markAnnouncementsSeen(uid, announcements || []);
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

  useRealtimeRefresh(`tenant-notifications-${tenantId}`, [
    { table: 'tenant_notifications', filter: `tenant_id=eq.${tenantId}` },
    { table: 'announcements' },
  ], loadNotifications, Boolean(user?.tenant_id));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [user]);

  const handleNotificationPress = async (notification) => {
    if (notification.type === 'announcement') {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
      );
      await markAnnouncementsSeen(user?.uid || user?.tenant_id, [notification.announcement]);
      setSelectedAnnouncement(notification.announcement);
      return;
    }
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

  const handleDismissNotification = async (notification, event) => {
    event?.stopPropagation?.();
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    try {
      if (notification.type === 'announcement') {
        await dismissAnnouncement(user?.uid || user?.tenant_id, notification.id);
      } else {
        const complaintId = notification.related_complaint_id
          || notification.complaint_id
          || notification.data?.complaint_id;
        if (String(notification.type || '').toLowerCase().includes('complaint') && complaintId) {
          await deleteResolvedTenantComplaint(complaintId, tenantId);
        }
        await dismissTenantNotification(notification.id);
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
      loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read && n.type !== 'announcement');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.all(
      unread.map((n) =>
        markNotificationAsRead(n.id).catch((err) => console.error('Error marking notification as read:', err))
      )
    );
  };

  const getNotificationIcon = (type, category) => {
    if (type === 'announcement') {
      switch (category) {
        case 'Payment':
          return { name: 'card', color: colors.successText, bg: colors.successBg, label: 'Payment' };
        case 'Maintenance':
          return { name: 'construct', color: colors.infoText, bg: colors.infoBg, label: 'Maintenance' };
        case 'House Rules':
          return { name: 'document-text', color: colors.warningText, bg: colors.warningBg, label: 'House Rules' };
        default:
          return { name: 'megaphone', color: colors.accent, bg: colors.accentBg, label: 'Announcement' };
      }
    }
    switch (type) {
      case 'approval':
        return { name: 'checkmark-circle', color: colors.successText, bg: colors.successBg, label: 'Approved' };
      case 'rejection':
        return { name: 'close-circle', color: colors.dangerText, bg: colors.dangerBg, label: 'Declined' };
      case 'invoice_created':
        return { name: 'document-text', color: '#f59e0b', bg: '#fef3c7', label: 'Invoice' };
      case 'payment_recorded':
        return { name: 'cash', color: colors.successText, bg: colors.successBg, label: 'Payment' };
      default:
        return { name: 'notifications', color: colors.accent, bg: colors.accentBg, label: 'Notification' };
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

  if (loading) return <ScreenSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: isMobile ? 16 : 40, paddingBottom: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fs(12),
              fontWeight: '700',
              letterSpacing: 1.5,
              color: colors.textSecondary,
              marginBottom: 4,
            }}
          >
            TENANT PORTAL
          </Text>
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
            {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12 }}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.accent} />
              <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.accent }}>Mark all as read</Text>
            </TouchableOpacity>
          )}
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
                    const iconData = getNotificationIcon(notification.type, notification.category);

                    return (
                      <TouchableOpacity
                        key={notification.id}
                        activeOpacity={0.8}
                        onPress={() => handleNotificationPress(notification)}
                        style={{
                          ...cardStyle,
                          backgroundColor: notification.read ? colors.card : colors.accentBg,
                          borderColor: notification.read ? colors.cardBorder : colors.accent,
                          borderWidth: 1,
                          borderLeftWidth: 4,
                          borderLeftColor: iconData.color,
                          borderRadius: 20,
                          overflow: 'hidden',
                          padding: 16,
                          paddingTop: 34,
                        }}
                      >
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Dismiss ${notification.title || 'notification'}`}
                          onPress={(event) => handleDismissNotification(notification, event)}
                          hitSlop={8}
                          style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}
                        >
                          <Ionicons name="close" size={15} color={colors.dangerText} />
                        </TouchableOpacity>
                        {/* Top row: icon, category tag, time */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 14,
                              backgroundColor: iconData.bg,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name={iconData.name} size={22} color={iconData.color} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: iconData.bg,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: fs(11),
                                  fontWeight: '800',
                                  letterSpacing: 0.6,
                                  textTransform: 'uppercase',
                                  color: iconData.color,
                                }}
                              >
                                {iconData.label}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            {!notification.read && (
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
                            )}
                            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                            <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted }}>
                              {formatDate(notification.created_at)}
                            </Text>
                          </View>
                        </View>

                        {/* Title and message */}
                        <Text
                          style={{
                            fontSize: fs(16),
                            fontWeight: '800',
                            color: colors.text,
                            lineHeight: 23,
                            marginBottom: 6,
                          }}
                        >
                          {notification.title}
                        </Text>

                        <Text
                          style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 21 }}
                          numberOfLines={notification.type === 'announcement' ? 3 : undefined}
                        >
                          {notification.message}
                        </Text>
                        {notification.type === 'announcement' && (notification.message || '').length > 110 && (
                          <Text style={{ fontSize: fs(13), fontWeight: '700', color: iconData.color, marginTop: 8 }}>
                            Read more
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <AnnouncementDetailsModal announcement={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
