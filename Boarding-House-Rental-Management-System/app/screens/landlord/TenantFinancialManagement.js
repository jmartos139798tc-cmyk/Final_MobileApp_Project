import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getTenantsWithFinancialStatus } from '../../services/dataService';
import RecordPaymentModal from '../../components/landlord/RecordPaymentModal';

export default function TenantFinancialManagement({ navigation }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Modal states
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const loadTenants = async (filter = 'all') => {
    try {
      setError(null);
      const data = await getTenantsWithFinancialStatus(filter);
      setTenants(data);
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError('Failed to load tenant financial data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTenants(activeFilter);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTenants(activeFilter);
  }, [activeFilter]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setLoading(true);
  };

  const handleRecordPayment = (tenant) => {
    setSelectedTenant(tenant);
    setPaymentModalVisible(true);
  };

  const handleViewDetails = (tenant) => {
    navigation.navigate('TenantDetailFinancial', { tenantId: tenant.tenantId });
  };

  const handlePaymentSuccess = () => {
    setPaymentModalVisible(false);
    setSelectedTenant(null);
    loadTenants(activeFilter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return { bg: colors.successBg, text: colors.successText };
      case 'unpaid':
        return { bg: '#fef3c7', text: '#f59e0b' };
      case 'overdue':
        return { bg: colors.dangerBg, text: colors.dangerText };
      default:
        return { bg: colors.bg, text: colors.textSecondary };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filters = [
    { id: 'all', label: 'All', count: null },
    { id: 'paid', label: 'Paid', count: null },
    { id: 'unpaid', label: 'Unpaid', count: null },
    { id: 'overdue', label: 'Overdue', count: null },
  ];

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 12 }}>Loading financial data...</Text>
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
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700' }}>Tenant Finances</Text>
          <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 4 }}>
            Manage payments and balances
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => handleFilterChange(filter.id)}
              style={{
                backgroundColor: activeFilter === filter.id ? colors.accent : colors.card,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: activeFilter === filter.id ? colors.accent : colors.cardBorder,
              }}
            >
              <Text
                style={{
                  fontSize: fs(14),
                  fontWeight: '700',
                  color: activeFilter === filter.id ? '#fff' : colors.text,
                }}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
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

        {/* Tenants List */}
        {tenants.length === 0 ? (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 48, alignItems: 'center' }}>
            <Ionicons name="wallet-outline" size={64} color={colors.textMuted} />
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginTop: 16 }}>
              {activeFilter === 'all' ? 'No Tenants' : `No ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Tenants`}
            </Text>
            <Text style={{ fontSize: fs(14), color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
              {activeFilter === 'all' 
                ? 'Approved tenants with active leases will appear here.'
                : `No tenants with ${activeFilter} status at this time.`}
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {tenants.map((tenant) => {
              const statusColors = getStatusColor(tenant.status);
              return (
                <View
                  key={tenant.id}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: 16,
                  }}
                >
                  {/* Tenant Info */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    {/* Avatar */}
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: tenant.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: fs(18), fontWeight: '800', color: '#fff' }}>{tenant.initials}</Text>
                    </View>

                    {/* Details */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text }}>{tenant.name}</Text>
                      <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 2 }}>
                        Room {tenant.roomNumber} • ₱{tenant.monthlyRent.toLocaleString()}/month
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={{
                        backgroundColor: statusColors.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: fs(11), fontWeight: '700', color: statusColors.text }}>
                        {tenant.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Financial Info */}
                  <View
                    style={{
                      backgroundColor: colors.bg,
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Outstanding Balance</Text>
                      <Text
                        style={{
                          fontSize: fs(16),
                          fontWeight: '700',
                          color: tenant.balance > 0 ? colors.dangerText : colors.successText,
                        }}
                      >
                        ₱{tenant.balance.toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Last Payment</Text>
                      <Text style={{ fontSize: fs(13), color: colors.textMuted }}>
                        {formatDate(tenant.lastPayment)}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => handleViewDetails(tenant)}
                      style={{
                        flex: 1,
                        backgroundColor: colors.bg,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                      }}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.text} />
                      <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>View Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRecordPayment(tenant)}
                      style={{
                        flex: 1,
                        backgroundColor: colors.accent,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="cash-outline" size={18} color="#fff" />
                      <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#fff' }}>Record Payment</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Record Payment Modal */}
      {selectedTenant && (
        <RecordPaymentModal
          visible={paymentModalVisible}
          tenant={selectedTenant}
          onClose={() => setPaymentModalVisible(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </View>
  );
}
