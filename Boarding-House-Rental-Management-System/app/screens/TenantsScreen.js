import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native';
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
} from '../utils/responsive';

export default function TenantsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const tenants = [
    { id: 1, name: 'Maria Santos', initials: 'MS', room: 1, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#ef4444' },
    { id: 2, name: 'Ana Reyes', initials: 'AR', room: 2, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 500, color: '#8b5cf6' },
    { id: 3, name: 'Joy Cruz', initials: 'JC', room: 4, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#3b82f6' },
    { id: 4, name: 'Lyn Bautista', initials: 'LB', room: 5, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 2500, color: '#10b981' },
    { id: 5, name: 'Rose Dela Cruz', initials: 'RD', room: 7, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#ef4444' },
    { id: 6, name: 'Claire Flores', initials: 'CF', room: 8, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#8b5cf6' },
    { id: 7, name: 'Beth Mendoza', initials: 'BM', room: 9, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 750, color: '#3b82f6' },
    { id: 8, name: 'Shei Ramos', initials: 'SR', room: 10, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#10b981' },
    { id: 9, name: 'Cel Garcia', initials: 'CG', room: 11, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#f59e0b' },
    { id: 10, name: 'Diane Torres', initials: 'DT', room: 12, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 2500, color: '#ec4899' },
    { id: 11, name: 'Tess Villanueva', initials: 'TV', room: 13, type: 'Double', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#06b6d4' },
    { id: 12, name: 'Karen Silva', initials: 'KS', room: 14, type: 'Double', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 3500, color: '#8b5cf6' },
    { id: 13, name: 'Lisa Mendez', initials: 'LM', room: 17, type: 'Double', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 1200, color: '#f59e0b' },
    { id: 14, name: 'Nina Reyes', initials: 'NR', room: 16, type: 'Double', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#10b981' },
  ];

  const paidCount = tenants.filter((t) => t.status === 'paid').length;
  const unpaidCount = tenants.filter((t) => t.status === 'unpaid').length;

  const filteredTenants = tenants.filter((tenant) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      tenant.name.toLowerCase().includes(query) ||
      `room ${tenant.room}`.includes(query) ||
      tenant.room.toString().includes(query)
    );
  });

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
            {tenants.length} registered
          </Text>
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700', marginTop: 4 }}>
            Tenants
          </Text>

          {/* Search Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.searchBg,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: Platform.OS === 'ios' ? 12 : 10,
              borderWidth: 1,
              borderColor: colors.searchBorder,
              marginTop: spacing.lg,
            }}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={{
                flex: 1,
                color: colors.text,
                fontSize: fs(14),
                paddingVertical: 0,
              }}
              placeholder="Search tenant or room..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Summary Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.success,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.textSecondary }}>
                {paidCount} Paid
              </Text>
            </View>
            <Text style={{ fontSize: fs(13), color: colors.textMuted, marginHorizontal: 8 }}>·</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.warning,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: fs(13), fontWeight: '600', color: colors.textSecondary }}>
                {unpaidCount} Unpaid
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tenants List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingTop: spacing.xs,
          paddingBottom: 20,
          gap: spacing.md,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%', gap: spacing.md }}>
          {filteredTenants.length === 0 ? (
            <View
              style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                padding: spacing.xl,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: spacing.md,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.accentBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <Ionicons name="search" size={20} color={colors.accent} />
              </View>
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>
                No tenants found
              </Text>
              <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                No tenant matches "{searchQuery}". Try a different name or room number.
              </Text>
            </View>
          ) : (
            filteredTenants.map((tenant) => (
              <TouchableOpacity
                key={tenant.id}
                activeOpacity={0.7}
                style={{
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  borderLeftWidth: 3,
                  borderLeftColor: tenant.status === 'paid' ? colors.success : colors.warning,
                  padding: isDesktop ? 20 : 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {/* Avatar */}
                <View
                  style={{
                    width: isDesktop ? 52 : 44,
                    height: isDesktop ? 52 : 44,
                    borderRadius: isDesktop ? 26 : 22,
                    backgroundColor: tenant.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Text style={{ fontSize: fs(15), fontWeight: '800', color: '#ffffff' }}>
                    {tenant.initials}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text
                    style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}
                    numberOfLines={1}
                  >
                    {tenant.name}
                  </Text>
                  <Text
                    style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted, marginTop: 3 }}
                    numberOfLines={1}
                  >
                    Room {tenant.room} · {tenant.type} · Due {tenant.dueDate}
                  </Text>
                </View>

                {/* Status */}
                <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                  {tenant.status === 'paid' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.success }}>
                        Paid
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: fs(15), fontWeight: '800', color: colors.warning }}>
                        ₱{tenant.balance.toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: fs(11), fontWeight: '600', color: colors.warning, marginTop: 2 }}>
                        unpaid
                      </Text>
                    </View>
                  )}
                </View>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={18} color={colors.cardBorder} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
