import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import {
  isMobile,
  isTablet,
  isDesktop,
  getResponsivePadding,
  fs,
  spacing,
  cardStyle,
  cardShadow,
  safeAreaTop,
  accentShadow,
} from '../utils/responsive';

export default function CaretakerDashboard({ onNavigate }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning 👋';
    if (hour < 18) return 'Good afternoon 👋';
    return 'Good evening 👋';
  };

  const pendingIssues = [
    { id: 1, room: 'R2', issue: 'Leaking faucet in bathroom', tenant: 'Ana Reyes', date: 'Sep 12, 2026' },
    { id: 2, room: 'R5', issue: 'Ceiling fan not working', tenant: 'Lyn Bautista', date: 'Sep 14, 2026' },
  ];

  const statsRow1 = [
    {
      id: 'rooms',
      label: 'Total Rooms',
      value: '17',
      subtext: '12 single · 5 double',
      icon: 'home',
      color: colors.info,
      bgColor: colors.iconBgBlue,
      target: 'rooms',
    },
    {
      id: 'balance',
      label: 'Unpaid Balance',
      value: '₱11.5k',
      subtext: '6 tenants pending',
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
      value: '14',
      subtext: '3 vacant rooms',
      icon: 'people',
      color: colors.success,
      bgColor: colors.iconBgGreen,
      target: 'tenants',
    },
    {
      id: 'issues',
      label: 'Open Issues',
      value: '2',
      subtext: 'Requires action',
      icon: 'alert-circle',
      color: colors.warning,
      bgColor: colors.iconBgYellow,
      target: 'issues',
    },
  ];

  const renderStatCard = (item) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.7}
      onPress={() => onNavigate && onNavigate(item.target)}
      style={{
        ...cardStyle,
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        flex: 1,
        padding: isDesktop ? 20 : 16,
        borderLeftWidth: 3,
        borderLeftColor: item.color,
        justifyContent: 'space-between',
        minHeight: 115,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: item.bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <View>
        <Text
          style={{ fontSize: fs(12), fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        <Text style={{ fontSize: fs(24), fontWeight: '800', color: colors.text }}>
          {item.value}
        </Text>
        <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
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
          paddingBottom: 20,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header Section */}
          <View
            style={{
              paddingHorizontal: padding,
              paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60,
              paddingBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '500', marginBottom: 4 }}>
              September 2026
            </Text>
            <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '600' }}>
              {getGreeting()}
            </Text>
            <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '800', marginTop: 2 }}>
              Dashboard
            </Text>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            {/* Occupancy Rate Card */}
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
                      fontSize: fs(11),
                      fontWeight: '800',
                      color: colors.heroSubtext,
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    OCCUPANCY RATE
                  </Text>
                  <Text style={{ fontSize: fs(52), fontWeight: '900', color: colors.heroText }}>
                    82%
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
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.heroText }}>
                  14 occupied
                </Text>
                <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.heroSubtext }}>
                  3 vacant rooms
                </Text>
              </View>

              <View
                style={{
                  height: 8,
                  backgroundColor: colors.heroBarBg,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <View style={{ width: '82%', height: '100%', backgroundColor: colors.heroBarFill, borderRadius: 8 }} />
              </View>
            </View>

            {/* Stats - 2x2 Grid */}
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {statsRow1.map(renderStatCard)}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {statsRow2.map(renderStatCard)}
              </View>
            </View>

            {/* Pending Issues Section */}
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: fs(13),
                    fontWeight: '700',
                    color: colors.textSecondary,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Pending Issues
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onNavigate && onNavigate('issues')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.accent }}>
                    View all
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: spacing.sm }}>
                {pendingIssues.map((issue) => (
                  <TouchableOpacity
                    key={issue.id}
                    activeOpacity={0.7}
                    onPress={() => onNavigate && onNavigate('issues')}
                    style={{
                      ...cardStyle,
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      borderLeftWidth: 3,
                      borderLeftColor: colors.warning,
                      padding: isDesktop ? 20 : 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
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
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, flex: 1 }}
                          numberOfLines={1}
                        >
                          {issue.issue}
                        </Text>
                        <View
                          style={{
                            backgroundColor: colors.warningBg,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: fs(10), fontWeight: '700', color: colors.warningText }}>
                            Pending
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                        <Text style={{ fontSize: fs(12), color: colors.textMuted }} numberOfLines={1}>
                          {issue.tenant}
                        </Text>
                        <Text style={{ fontSize: fs(10), color: colors.textMuted }}>•</Text>
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={{ fontSize: fs(12), color: colors.textMuted }}>
                          {issue.date}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Latest Announcement */}
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: fs(13),
                    fontWeight: '700',
                    color: colors.textSecondary,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Latest Announcement
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onNavigate && onNavigate('announce')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.accent }}>
                    View all
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onNavigate && onNavigate('announce')}
                style={{
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  borderLeftWidth: 3,
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
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons name="megaphone" size={11} color={colors.successText} />
                    <Text style={{ fontSize: fs(10), fontWeight: '700', color: colors.successText }}>
                      Payment
                    </Text>
                  </View>
                  <Text style={{ fontSize: fs(11), color: colors.textMuted }}>
                    Sep 15, 2026
                  </Text>
                </View>
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                  October Rent Reminder
                </Text>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary, lineHeight: 20 }}>
                  October rent is due on October 5, 2026. Please settle your balances on time to avoid late fees.
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
