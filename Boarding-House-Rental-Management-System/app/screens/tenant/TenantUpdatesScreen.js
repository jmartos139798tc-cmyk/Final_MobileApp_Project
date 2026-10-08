import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getAnnouncements } from '../../services/dataService';
import AnnouncementDetailsModal from '../../components/AnnouncementDetailsModal';

export default function TenantUpdatesScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnnouncements();
        if (isMounted) setAnnouncements(data);
      } catch (err) {
        if (isMounted) setError('Failed to load announcements. Check your connection and try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [refreshKey]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error}
        </Text>
        <TouchableOpacity onPress={() => setRefreshKey((key) => key + 1)} activeOpacity={0.8} style={{ marginTop: 18, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 999, overflow: 'hidden', minHeight: 46, justifyContent: 'center' }}>
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 30,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ padding, paddingTop: isMobile ? 16 : isDesktop ? 28 : 24, paddingBottom: 20 }}>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 5 }}>TENANT PORTAL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '900', letterSpacing: -0.5 }}>Announcements</Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 21, marginTop: 6 }}>Notices and updates from your property.</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="notifications-outline" size={22} color={colors.successText} />
              </View>
            </View>
          </View>

          {/* Announcements Cards */}
          <View style={{ paddingHorizontal: padding, gap: spacing.md }}>
            {announcements.length === 0 ? (
              <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 28, alignItems: 'center' }}>
                <Ionicons name="checkmark-done-circle-outline" size={38} color={colors.success} />
                <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text, marginTop: 10 }}>You’re all caught up</Text>
                <Text style={{ fontSize: fs(14), color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>New property announcements will appear here.</Text>
              </View>
            ) : (
              announcements.map((item) => (
                <TouchableOpacity
                  key={item.id || item.announcement_id}
                  accessibilityRole="button"
                  accessibilityLabel={`Read announcement: ${item.title}`}
                  activeOpacity={0.8}
                  onPress={() => setSelectedAnnouncement(item)}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: isMobile ? 18 : 22,
                    borderRadius: 20,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: colors.successBg,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        fontSize: fs(12),
                        fontWeight: '800',
                        color: colors.successText,
                      }}>
                        {item.category || 'Property update'}
                      </Text>
                    </View>

                    <Text style={{
                      fontSize: fs(12),
                      fontWeight: '500',
                      color: colors.textMuted,
                    }}>
                      {item.date || item.created_at || 'Recently posted'}
                    </Text>
                  </View>

                  <Text style={{
                    fontSize: fs(16),
                    fontWeight: '800',
                    color: colors.text,
                    marginBottom: 8,
                    lineHeight: 23,
                  }}>
                    {item.title}
                  </Text>

                  <Text style={{
                    fontSize: fs(14),
                    color: colors.textSecondary,
                    lineHeight: 21,
                    fontWeight: '400',
                  }}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <AnnouncementDetailsModal announcement={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />
    </View>
  );
}
