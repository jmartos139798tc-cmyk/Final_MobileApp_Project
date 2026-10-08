import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Platform, ActivityIndicator, Modal, Pressable } from 'react-native';
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
import { getTenants } from '../services/dataService';

export default function TenantsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  useEffect(() => {
    let isMounted = true;
    const fetchTenants = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTenants();
        if (isMounted) {
          setTenants(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load tenants. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTenants();
    return () => {
      isMounted = false;
    };
  }, []);

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
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error}
        </Text>
      </View>
    );
  }

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
                {searchQuery ? `No tenant matches "${searchQuery}". Try a different name or room number.` : 'No tenants are registered.'}
              </Text>
            </View>
          ) : (
            filteredTenants.map((tenant) => (
              <TouchableOpacity
                key={tenant.id}
                activeOpacity={0.7}
                onPress={() => setSelectedTenant(tenant)}
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
                        ?{tenant.balance.toLocaleString()}
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

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <Modal
          visible={!!selectedTenant}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTenant(null)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
            onPress={() => setSelectedTenant(null)}
          >
            <Pressable
              style={{
                width: '100%',
                maxWidth: 500,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                maxHeight: '90%',
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        backgroundColor: selectedTenant.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: fs(20), fontWeight: '800', color: '#ffffff' }}>
                        {selectedTenant.initials}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedTenant(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: fs(22), fontWeight: '800', color: colors.text }}>
                    {selectedTenant.name}
                  </Text>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 4 }}>
                    Tenant Details
                  </Text>
                </View>

                {/* Details */}
                <View style={{ padding: 24 }}>
                  {/* Room */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                      Room Assignment
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="bed-outline" size={20} color={colors.accent} />
                      </View>
                      <View>
                        <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>
                          Room {selectedTenant.room}
                        </Text>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>
                          {selectedTenant.type}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Monthly Rent */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                      Monthly Rent
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="cash-outline" size={20} color={colors.successText} />
                      </View>
                      <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>
                        ?{(selectedTenant.amount || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Due Date */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                      Payment Due Date
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="calendar-outline" size={20} color={colors.infoText} />
                      </View>
                      <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>
                        {selectedTenant.dueDate}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Status */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
                      Payment Status
                    </Text>
                    {selectedTenant.status === 'paid' ? (
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 10,
                        backgroundColor: colors.successBg,
                        padding: 14,
                        borderRadius: 12,
                      }}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.successText} />
                        <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.successText }}>
                          Paid in Full
                        </Text>
                      </View>
                    ) : (
                      <View style={{ 
                        backgroundColor: colors.warningBg,
                        padding: 14,
                        borderRadius: 12,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <Ionicons name="alert-circle" size={24} color={colors.warningText} />
                          <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.warningText }}>
                            Unpaid Balance
                          </Text>
                        </View>
                        <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.warningText }}>
                          ?{selectedTenant.balance.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}