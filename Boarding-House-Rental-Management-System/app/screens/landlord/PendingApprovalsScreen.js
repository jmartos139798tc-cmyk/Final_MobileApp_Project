import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getPendingTenantRegistrations } from '../../services/dataService';
import TenantApprovalModal from '../../components/landlord/TenantApprovalModal';
import TenantRejectionModal from '../../components/landlord/TenantRejectionModal';

export default function PendingApprovalsScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  
  const [pendingTenants, setPendingTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const loadPendingTenants = async () => {
    try {
      setError(null);
      const data = await getPendingTenantRegistrations();
      setPendingTenants(data);
    } catch (err) {
      console.error('Error loading pending tenants:', err);
      setError('Failed to load pending approvals. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPendingTenants();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPendingTenants();
  }, []);

  const handleApprovePress = (tenant) => {
    setSelectedTenant(tenant);
    setApprovalModalVisible(true);
  };

  const handleRejectPress = (tenant) => {
    setSelectedTenant(tenant);
    setRejectionModalVisible(true);
  };

  const handleApprovalSuccess = () => {
    setApprovalModalVisible(false);
    setSelectedTenant(null);
    loadPendingTenants();
  };

  const handleRejectionSuccess = () => {
    setRejectionModalVisible(false);
    setSelectedTenant(null);
    loadPendingTenants();
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 12 }}>Loading pending approvals...</Text>
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
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700' }}>Pending Approvals</Text>
          <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 4 }}>
            Review and approve tenant registrations
          </Text>
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

        {/* Pending Tenants List */}
        {pendingTenants.length === 0 ? (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 48, alignItems: 'center' }}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.textMuted} />
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginTop: 16 }}>All Caught Up!</Text>
            <Text style={{ fontSize: fs(14), color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
              No pending tenant approvals at this time.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {pendingTenants.map((tenant) => (
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
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  {/* Avatar */}
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: tenant.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: fs(20), fontWeight: '800', color: '#fff' }}>{tenant.initials}</Text>
                  </View>

                  {/* Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text }}>{tenant.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                      <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>{tenant.phone}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={{ fontSize: fs(13), color: colors.textMuted }}>
                        Registered: {formatDate(tenant.registeredAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={{
                      backgroundColor: '#fef3c7',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ fontSize: fs(12), fontWeight: '700', color: '#f59e0b' }}>PENDING</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleRejectPress(tenant)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.dangerBg,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={colors.dangerText} />
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.dangerText }}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleApprovePress(tenant)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.accent,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {selectedTenant && (
        <>
          <TenantApprovalModal
            visible={approvalModalVisible}
            tenant={selectedTenant}
            onClose={() => setApprovalModalVisible(false)}
            onSuccess={handleApprovalSuccess}
          />

          <TenantRejectionModal
            visible={rejectionModalVisible}
            tenant={selectedTenant}
            onClose={() => setRejectionModalVisible(false)}
            onSuccess={handleRejectionSuccess}
          />
        </>
      )}
    </View>
  );
}
