import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import {
  isMobile,
  isDesktop,
  getResponsivePadding,
  fs,
  spacing,
  cardStyle,
  safeAreaTop,
  accentShadow,
} from '../utils/responsive';
import { getCaretakerDashboardData } from '../services/dataService';

export default function CaretakerDashboard({ onNavigate }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCaretakerDashboardData();
        if (isMounted) {
          setDashData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const go = (target) => onNavigate && onNavigate(target);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !dashData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error || 'Unable to load dashboard data.'}
        </Text>
      </View>
    );
  }

  const {
    totalRooms,
    singleRooms,
    doubleRooms,
    occupied,
    vacant,
    rate,
    unpaidCount,
    totalUnpaid,
    pendingIssueCount,
    pendingIssues = [],
    latestAnnouncement,
  } = dashData;

  const statsRow1 = [
    {
      id: 'rooms',
      label: 'Total Rooms',
      value: `${totalRooms}`,
      subtext: `${singleRooms} single · ${doubleRooms} double`,
      icon: 'home',
      color: colors.info,
      bgColor: colors.iconBgBlue,
      target: 'rooms',
    },
    {
      id: 'balance',
      label: 'Unpaid Balance',
      value: totalUnpaid >= 1000 ? `₱${(totalUnpaid / 1000).toFixed(1)}k` : `₱${totalUnpaid}`,
      subtext: `${unpaidCount} tenants pending`,
      icon: 'wallet',
      color: colors.danger,
      bgColor: colors.iconBgRed,
      target: 'billing',
    },
  ];

  const statsRow2 = [
    {
      id: 'tenants',
      label: 'Active Tenants',
      value: `${occupied}`,
      subtext: `${vacant} vacant rooms`,
      icon: 'people',
      color: colors.success,
      bgColor: colors.iconBgGreen,
      target: 'tenants',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: `${pendingIssueCount}`,
      subtext: 'Needs your action',
      icon: 'alert-circle',
      color: colors.warning,
      bgColor: colors.iconBgYellow,
      target: 'issues',
    },
  ];

  const sectionTitle = {
    fontSize: fs(15),
    fontWeight: '700',
    color: colors.text,
  };

  const viewAllLink = (target) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => go(target)}
      style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}
    >
      <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.accent }}>
        View all
      </Text>
    </TouchableOpacity>
  );

  const renderStatCard = (item) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.7}
      onPress={() => go(item.target)}
      style={{
        ...cardStyle,
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        flex: 1,
        padding: isDesktop ? 20 : 16,
        borderLeftWidth: 4,
        borderLeftColor: item.color,
        justifyContent: 'space-between',
        minHeight: 130,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: item.bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View>
        <Text
          style={{ fontSize: fs(13), fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}
        >
          {item.label}
        </Text>
        <Text style={{ fontSize: fs(26), fontWeight: '800', color: colors.text }}>
          {item.value}
        </Text>
        <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>
          {item.subtext}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 24,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: padding,
              paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60,
              paddingBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '500', marginBottom: 4 }}>
              {todayLabel}
            </Text>
            <Text style={{ fontSize: fs(15), color: colors.textSecondary, fontWeight: '600' }}>
              {getGreeting()}
            </Text>
            <Text style={{ fontSize: fs(30), color: colors.text, fontWeight: '800', marginTop: 2 }}>
              Dashboard
            </Text>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            {/* Occupancy Card */}
            <View
              style={{
                backgroundColor: colors.heroBg,
                borderRadius: 20,
                padding: isDesktop ? 28 : 22,
                ...accentShadow,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: fs(13),
                      fontWeight: '700',
                      color: colors.heroSubtext,
                      marginBottom: 4,
                    }}
                  >
                    Occupancy rate
                  </Text>
                  <Text style={{ fontSize: fs(44), fontWeight: '900', color: colors.heroText }}>
                    {rate}%
                  </Text>
                </View>
                <Ionicons name="business" size={48} color={colors.heroBarBg} />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 14,
                  marginBottom: 10,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.heroText }}>
                  {occupied} occupied
                </Text>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.heroSubtext }}>
                  {vacant} vacant rooms
                </Text>
              </View>

              <View
                style={{
                  height: 10,
                  backgroundColor: colors.heroBarBg,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <View style={{ width: `${Math.min(100, Math.max(0, rate))}%`, height: '100%', backgroundColor: colors.heroBarFill, borderRadius: 8 }} />
              </View>
            </View>

            {/* Stats 2x2 */}
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {statsRow1.map(renderStatCard)}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {statsRow2.map(renderStatCard)}
              </View>
            </View>

            {/* Pending Issues */}
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={sectionTitle}>Pending issues</Text>
                {viewAllLink('issues')}
              </View>

              <View style={{ gap: spacing.sm }}>
                {pendingIssues.length === 0 ? (
                  <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted }}>No pending issues</Text>
                  </View>
                ) : (
                  pendingIssues.map((issue) => (
                    <TouchableOpacity
                      key={issue.id}
                      activeOpacity={0.7}
                      onPress={() => go('issues')}
                      style={{
                        ...cardStyle,
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.warning,
                        padding: isDesktop ? 20 : 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        minHeight: 76,
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          backgroundColor: colors.iconBgYellow,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: fs(14), fontWeight: '800', color: colors.warning }}>
                          {issue.room}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: fs(15), fontWeight: '700', color: colors.text, marginBottom: 4 }}
                          numberOfLines={2}
                        >
                          {issue.issue}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: colors.warningBg,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.warningText }}>
                              Pending
                            </Text>
                          </View>
                          <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>
                            {issue.tenant} · {issue.date}
                          </Text>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Latest Announcement */}
            {latestAnnouncement && (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text style={sectionTitle}>Latest announcement</Text>
                  {viewAllLink('announce')}
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => go('announce')}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.success,
                    padding: isDesktop ? 22 : 18,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: colors.successBg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Ionicons name="megaphone" size={14} color={colors.successText} />
                      <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.successText }}>
                        {latestAnnouncement.category}
                      </Text>
                    </View>
                    <Text style={{ fontSize: fs(12), color: colors.textMuted }}>
                      {latestAnnouncement.created_at || latestAnnouncement.date}
                    </Text>
                  </View>
                  <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                    {latestAnnouncement.title}
                  </Text>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 22 }}>
                    {latestAnnouncement.description}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}