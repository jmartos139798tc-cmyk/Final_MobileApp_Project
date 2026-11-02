import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle } from '../../utils/responsive';
import { getPendingTenantRegistrations, getPendingMoveOutRequests, reviewTenantMoveOutRequest } from '../../services/dataService';
import TenantApprovalModal from '../../components/landlord/TenantApprovalModal';
import TenantRejectionModal from '../../components/landlord/TenantRejectionModal';
import TenantListPager from '../../components/landlord/TenantListPager';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const TENANTS_PER_PAGE = 5;

export default function PendingApprovalsScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  
  const [pendingTenants, setPendingTenants] = useState([]);
  const [moveOutRequests, setMoveOutRequests] = useState([]);
  const [reviewingMoveOutId, setReviewingMoveOutId] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [realtimeVersion, setRealtimeVersion] = useState(0);

  const loadPendingTenants = async () => {
    try {
      setError(null);
      const [data, requests] = await Promise.all([
        getPendingTenantRegistrations(),
        getPendingMoveOutRequests(),
      ]);
      setPendingTenants(data);
      setMoveOutRequests(requests);
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
  }, [realtimeVersion]);

  useRealtimeRefresh('landlord-pending-approvals-list', [
    { table: 'tenants' },
    { table: 'room_assignment_requests' },
    { table: 'tenant_move_out_requests' },
  ], () => {
    setRealtimeVersion((version) => version + 1);
  });

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

  const handleModalClose = () => {
    setApprovalModalVisible(false);
    setRejectionModalVisible(false);
    setSelectedTenant(null);
  };

  const handleMoveOutDecision = async (request, status) => {
    if (reviewingMoveOutId) return;
    try {
      setReviewingMoveOutId(request.id);
      await reviewTenantMoveOutRequest(request.id, status);
      await loadPendingTenants();
    } catch (err) {
      console.error('Could not review move-out request:', err);
      setError(err?.message || 'Could not update the move-out request. Please try again.');
    } finally {
      setReviewingMoveOutId(null);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };
  const formatMoveOutDate = (dateStr) => {
    const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateStr || 'Date not provided';
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const pageCount = Math.max(1, Math.ceil(pendingTenants.length / TENANTS_PER_PAGE));
  const visibleTenants = pendingTenants.slice(page * TENANTS_PER_PAGE, (page + 1) * TENANTS_PER_PAGE);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [pageCount]);

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
            OWNER PORTAL
          </Text>
          <Text style={{ fontSize: fs(32), color: colors.text, fontWeight: '700' }}>Pending Approvals</Text>
          <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 4 }}>
            Review tenant applications and move-out requests
          </Text>
        </View>

        {moveOutRequests.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: fs(20), fontWeight: '800' }}>Move-out Requests</Text>
              <View style={{ backgroundColor: colors.warningBg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: colors.warningText, fontSize: fs(12), fontWeight: '800' }}>{moveOutRequests.length} PENDING</Text>
              </View>
            </View>
            <View style={{ gap: spacing.sm }}>
              {moveOutRequests.map((request) => (
                <View key={request.id} style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentBg }}>
                      <Ionicons name="exit-outline" size={22} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: fs(17), fontWeight: '800' }}>{request.tenant_name}</Text>
                      {!!request.room_number && <Text style={{ color: colors.textSecondary, fontSize: fs(13), marginTop: 3 }}>Room {request.room_number}</Text>}
                      {!!request.tenant_phone && <Text style={{ color: colors.textSecondary, fontSize: fs(13), marginTop: 2 }}>{request.tenant_phone}</Text>}
                      <Text style={{ color: colors.text, fontSize: fs(14), fontWeight: '700', marginTop: 10 }}>
                        Planned leaving date: {formatMoveOutDate(request.requested_move_out_date)}
                      </Text>
                      <View style={{ marginTop: 10, gap: 5 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: fs(12) }}>
                          1 month advance paid: <Text style={{ color: colors.text, fontWeight: '800' }}>₱{Number(request.advancePaid || 0).toLocaleString()} / ₱{Number(request.advanceTotal || 0).toLocaleString()}</Text>
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: fs(12) }}>
                          Security deposit paid: <Text style={{ color: colors.text, fontWeight: '800' }}>₱{Number(request.securityDepositPaid || 0).toLocaleString()} / ₱{Number(request.securityDepositTotal || 0).toLocaleString()}</Text>
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: colors.warningBg, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }}>
                      <Text style={{ color: colors.warningText, fontSize: fs(10), fontWeight: '800' }}>PENDING</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                    <TouchableOpacity
                      disabled={Boolean(reviewingMoveOutId)}
                      onPress={() => handleMoveOutDecision(request, 'declined')}
                      style={{ flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerBg, opacity: reviewingMoveOutId ? 0.6 : 1 }}
                    >
                      <Text style={{ color: colors.dangerText, fontSize: fs(14), fontWeight: '800' }}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={Boolean(reviewingMoveOutId)}
                      onPress={() => handleMoveOutDecision(request, 'approved')}
                      style={{ flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successText, opacity: reviewingMoveOutId ? 0.6 : 1 }}
                    >
                      {reviewingMoveOutId === request.id ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '800' }}>Approve</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={{ ...cardStyle, backgroundColor: colors.dangerBg, borderColor: colors.dangerText, padding: 16, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color={colors.dangerText} />
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600', flex: 1 }}>{error}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Retry loading tenant applications"
              disabled={refreshing}
              onPress={onRefresh}
              style={{ alignSelf: 'flex-start', marginTop: 12, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: refreshing ? 0.6 : 1 }}
            >
              {refreshing ? <ActivityIndicator size="small" color={colors.dangerText} /> : <Ionicons name="refresh" size={17} color={colors.dangerText} />}
              <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.dangerText }}>{refreshing ? 'Retrying…' : 'Try again'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Tenants List */}
        {pendingTenants.length === 0 && moveOutRequests.length === 0 && !error ? (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 48, alignItems: 'center' }}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.textMuted} />
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginTop: 16 }}>All Caught Up!</Text>
            <Text style={{ fontSize: fs(14), color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
              No pending tenant approvals at this time.
            </Text>
          </View>
        ) : pendingTenants.length > 0 ? (
          <>
            <TenantListPager
              page={page}
              pageSize={TENANTS_PER_PAGE}
              totalCount={pendingTenants.length}
              onPageChange={setPage}
              colors={colors}
            />
            <View style={{ gap: spacing.md }}>
            {visibleTenants.map((tenant) => (
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
                        {tenant.roomSetupUpdatedAt ? `Setup submitted: ${formatDate(tenant.roomSetupUpdatedAt)}` : 'Room & payment setup not submitted'}
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
                      backgroundColor: colors.dangerText,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleApprovePress(tenant)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.successText,
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
          </>
        ) : null}
      </ScrollView>

      {/* Modals */}
      {selectedTenant && (
        <>
          <TenantApprovalModal
            visible={approvalModalVisible}
            tenant={selectedTenant}
            onClose={handleModalClose}
            onSuccess={handleApprovalSuccess}
          />

          <TenantRejectionModal
            visible={rejectionModalVisible}
            tenant={selectedTenant}
            onClose={handleModalClose}
            onSuccess={handleRejectionSuccess}
          />
        </>
      )}
    </View>
  );
}
