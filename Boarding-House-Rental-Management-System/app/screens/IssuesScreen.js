import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
} from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function IssuesScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('All');
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const issues = [
    {
      id: 1,
      title: 'Leaking faucet in bathroom',
      tenant: 'Ana Reyes',
      initials: 'AR',
      room: 'Room 2',
      date: 'Sep 12, 2026',
      status: 'pending',
      color: '#8b5cf6',
    },
    {
      id: 2,
      title: 'Faulty electrical outlet',
      tenant: 'Beth Mendoza',
      initials: 'BM',
      room: 'Room 9',
      date: 'Sep 10, 2026',
      status: 'in-progress',
      color: '#3b82f6',
    },
    {
      id: 3,
      title: 'Window latch broken',
      tenant: 'Joy Cruz',
      initials: 'JC',
      room: 'Room 4',
      date: 'Sep 8, 2026',
      status: 'resolved',
      color: '#3b82f6',
    },
    {
      id: 4,
      title: 'Ceiling fan not working',
      tenant: 'Lyn Bautista',
      initials: 'LB',
      room: 'Room 5',
      date: 'Sep 14, 2026',
      status: 'pending',
      color: '#10b981',
    },
  ];

  const pendingCount = issues.filter((i) => i.status === 'pending').length;
  const inProgressCount = issues.filter((i) => i.status === 'in-progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;

  const statPills = [
    {
      statusKey: 'Pending',
      count: pendingCount,
      label: 'Pending',
      bg: colors.warningBg,
      text: colors.warningText,
      dot: colors.warning,
    },
    {
      statusKey: 'In Progress',
      count: inProgressCount,
      label: 'In Progress',
      bg: colors.infoBg,
      text: colors.infoText,
      dot: colors.info,
    },
    {
      statusKey: 'Resolved',
      count: resolvedCount,
      label: 'Resolved',
      bg: colors.successBg,
      text: colors.successText,
      dot: colors.success,
    },
  ];

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return issue.status === 'pending';
    if (filter === 'In Progress') return issue.status === 'in-progress';
    if (filter === 'Resolved') return issue.status === 'resolved';
    return true;
  });

  const getStatusBorderColor = (status) => {
    if (status === 'pending') return colors.warning;
    if (status === 'in-progress') return colors.info;
    if (status === 'resolved') return colors.success;
    return colors.cardBorder;
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') {
      return { bg: colors.warningBg, text: colors.warningText, dot: colors.warning, label: 'pending' };
    }
    if (status === 'in-progress') {
      return { bg: colors.infoBg, text: colors.infoText, dot: colors.info, label: 'in-progress' };
    }
    if (status === 'resolved') {
      return { bg: colors.successBg, text: colors.successText, dot: colors.success, label: 'resolved' };
    }
    return { bg: colors.cardBorder, text: colors.textMuted, dot: colors.textMuted, label: status };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: padding,
          paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60,
          paddingBottom: spacing.sm,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '500' }}>
            {issues.length} total
          </Text>
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700', marginTop: 4 }}>
            Complaints
          </Text>

          {/* Summary Count Bar */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              marginTop: spacing.md,
              alignItems: 'center',
            }}
          >
            {statPills.map((stat) => (
              <TouchableOpacity
                key={stat.label}
                activeOpacity={0.7}
                onPress={() => setFilter(filter === stat.statusKey ? 'All' : stat.statusKey)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: stat.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: stat.dot,
                  }}
                />
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: stat.text }}>
                  {stat.count} {stat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginTop: spacing.md,
              paddingBottom: 4,
            }}
          >
            {['All', 'Pending', 'In Progress', 'Resolved'].map((tab) => {
              const isActive = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.7}
                  onPress={() => setFilter(tab)}
                  style={{
                    paddingHorizontal: isDesktop ? 22 : 18,
                    paddingVertical: isDesktop ? 10 : 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? colors.accent : colors.filterBg,
                    borderWidth: 1,
                    borderColor: isActive ? colors.accent : colors.filterBorder,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fs(13),
                      fontWeight: '700',
                      color: isActive ? '#ffffff' : colors.textSecondary,
                    }}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingTop: spacing.sm,
          paddingBottom: 20,
          gap: spacing.lg,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%', gap: spacing.lg }}>
          {/* Section Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
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
              {filter === 'All' ? 'All Complaints' : `${filter} Complaints`} ({filteredIssues.length})
            </Text>
            {filter !== 'All' && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setFilter('All')}>
                <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.accent }}>
                  View all
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Issues List */}
          {filteredIssues.map((issue) => {
            const statusBadge = getStatusBadge(issue.status);
            return (
              <View
                key={issue.id}
                style={{
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: isDesktop ? 24 : 18,
                  borderLeftWidth: 3,
                  borderLeftColor: getStatusBorderColor(issue.status),
                }}
              >
                {/* Header: Title and Status Badge */}
                <View
                  style={{
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fs(16),
                      fontWeight: '700',
                      color: colors.text,
                      flex: 1,
                    }}
                    numberOfLines={2}
                  >
                    {issue.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: statusBadge.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      alignSelf: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: statusBadge.dot,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: fs(11),
                        fontWeight: '700',
                        color: statusBadge.text,
                        textTransform: 'capitalize',
                      }}
                    >
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Tenant Info */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: issue.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#ffffff' }}>
                      {issue.initials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}
                      numberOfLines={1}
                    >
                      {issue.tenant}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Ionicons name="business-outline" size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted }}>
                        {issue.room}
                      </Text>
                      <Text style={{ fontSize: fs(12), color: colors.textMuted }}>•</Text>
                      <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                      <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted }}>
                        {issue.date}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                {issue.status !== 'resolved' ? (
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        backgroundColor: colors.accent,
                        paddingVertical: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        minHeight: 46,
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={{ fontSize: fs(13), fontWeight: '700', color: '#ffffff' }}>
                        Mark Resolved
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        paddingVertical: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        minHeight: 46,
                      }}
                    >
                      <Ionicons
                        name={issue.status === 'pending' ? 'play-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                      <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary }}>
                        {issue.status === 'pending' ? 'In Progress' : 'View'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      minHeight: 46,
                    }}
                  >
                    <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
                    <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary }}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Empty State */}
          {filteredIssues.length === 0 && (
            <View
              style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                padding: spacing.xl,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.accentBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.md,
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.accent} />
              </View>
              <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>
                No {filter.toLowerCase()} issues
              </Text>
              <Text
                style={{
                  fontSize: fs(13),
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginTop: 6,
                }}
              >
                There are no complaints matching the selected filter.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
