import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getCurrentTenant, getTenantBillingBreakdown, getTenantPaymentHistory, getTenantPaymentProofs } from '../../services/dataService';
import SubmitPaymentProofModal from '../../components/tenant/SubmitPaymentProofModal';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

export default function TenantFinancesScreen({ user, onNavigateToApplication }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [tenantInfo, setTenantInfo] = useState(null);
  const [billingBreakdown, setBillingBreakdown] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const tenantId = user?.tenant_id;

  const loadFinancialData = useCallback(async () => {
    if (!tenantId) {
      setTenantInfo(null);
      setError('Your tenant profile is not linked to this account. Please sign in again or contact the property manager.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      
      const [info, breakdown, history, proofs] = await Promise.all([
        getCurrentTenant(tenantId),
        getTenantBillingBreakdown(tenantId),
        getTenantPaymentHistory(tenantId),
        getTenantPaymentProofs(tenantId),
      ]);
      
      setTenantInfo(info);
      setBillingBreakdown(breakdown);
      setPaymentHistory(history);
      setPaymentProofs(proofs);
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError('Failed to load financial information. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  useRealtimeRefresh(`tenant-finances-${tenantId || 'unknown'}`, [
    { table: 'tenants', filter: `id=eq.${tenantId || ''}` },
    { table: 'invoices' },
    { table: 'payment_proofs', filter: `tenant_id=eq.${tenantId || ''}` },
    { table: 'room_assignment_requests', filter: `tenant_id=eq.${tenantId || ''}` },
    { table: 'leases', filter: `tenant_id=eq.${tenantId || ''}` },
  ], loadFinancialData, Boolean(tenantId));

  useEffect(() => {
    setLoading(true);
    loadFinancialData();
  }, [loadFinancialData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFinancialData();
  }, [loadFinancialData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'cash-outline';
      default:
        return 'wallet-outline';
    }
  };

  if (loading) return <ScreenSkeleton />;

  if (error || !tenantInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: padding, paddingTop: 40 }}>
        <View style={{ ...cardStyle, backgroundColor: colors.dangerBg, borderColor: colors.dangerText, padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.dangerText} />
          <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.dangerText, marginTop: 12 }}>
            {error || 'Unable to load financial data'}
          </Text>
          <TouchableOpacity onPress={loadFinancialData} style={{ marginTop: 16, backgroundColor: colors.dangerText, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ fontSize: fs(14), fontWeight: '600', color: '#fff' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (tenantInfo.accountStatus !== 'approved') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: isMobile ? 16 : 40 }}>
        <View style={{ paddingHorizontal: padding, marginBottom: 18 }}>
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
          <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '700' }}>My Finances</Text>
        </View>
        <View style={{ paddingHorizontal: padding }}>
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 22, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={32} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: fs(17), fontWeight: '800', textAlign: 'center', marginTop: 10 }}>Application review in progress</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fs(13), lineHeight: 19, textAlign: 'center', marginTop: 6 }}>
              Room selection and move-in payment setup are on your Application page.
            </Text>
            <TouchableOpacity onPress={onNavigateToApplication} accessibilityRole="button" style={{ marginTop: 15, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.accent }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: fs(13) }}>Open application</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const balance = Number(billingBreakdown?.totalOutstanding ?? tenantInfo.outstandingBalance ?? billingBreakdown?.outstanding ?? 0);
  const isOverdue = balance > 0 && billingBreakdown?.dueDate && new Date(billingBreakdown.dueDate) < new Date();
  
  const currentInvoice = billingBreakdown?.invoiceId ? {
    id: billingBreakdown.invoiceId,
    period: billingBreakdown.month,
    outstanding: billingBreakdown.outstanding,
  } : null;
  const hasPendingProof = paymentProofs.some((proof) => proof.invoiceId === currentInvoice?.id && proof.status === 'pending');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SubmitPaymentProofModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={currentInvoice}
        tenantId={tenantId}
        onSuccess={loadFinancialData}
      />
      
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
          <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '700' }}>My Finances</Text>
          <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 4 }}>
            {tenantInfo.roomNumber ? `Room ${tenantInfo.roomNumber}` : 'Your financial overview'}
          </Text>
        </View>

        {/* Current Balance Card */}
        <View
          style={{
            ...cardStyle,
            backgroundColor: balance > 0 ? colors.warningBg : colors.successBg,
            borderColor: balance > 0 ? colors.dangerText : colors.successText,
            padding: 20,
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ fontSize: fs(14), color: balance > 0 ? colors.orangetext : colors.successText, marginBottom: 8 }}>
            Current Balance
          </Text>
          <Text style={{ fontSize: fs(36), fontWeight: '700', color: colors.warningText }}>
            ₱{balance.toLocaleString()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Ionicons
              name={balance > 0 ? (isOverdue ? 'alert-circle' : 'time-outline') : 'checkmark-circle'}
              size={18}
              color={balance > 0 ? colors.dangerText : colors.successText}
            />
            <Text style={{ fontSize: fs(14), fontWeight: '600', color: balance > 0 ? colors.warningText : colors.successText }}>
              {balance === 0 ? 'All Paid Up!' : isOverdue ? `OVERDUE - Due: ${billingBreakdown?.dueDate}` : `Due: ${billingBreakdown?.dueDate || 'TBD'}`}
            </Text>
          </View>
        </View>

        {/* Submit Payment Button */}
        {balance > 0 && currentInvoice?.id && (
          <TouchableOpacity
            onPress={() => !hasPendingProof && setShowPaymentModal(true)}
            disabled={hasPendingProof || !currentInvoice?.id}
            style={{
              backgroundColor: hasPendingProof ? colors.warningText : colors.successText,
              padding: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: spacing.lg,
            }}
          >
            <Ionicons name={hasPendingProof ? 'time-outline' : 'cloud-upload-outline'} size={20} color="#ffffff" />
            <Text style={{ fontSize: fs(16), fontWeight: '700', color: '#ffffff' }}>
              {hasPendingProof ? 'Payment Proof Pending Review' : 'Submit Payment Proof'}
            </Text>
          </TouchableOpacity>
        )}
        {balance > 0 && !currentInvoice?.id && (
          <Text style={{ color: colors.dangerText, fontSize: fs(13), marginBottom: spacing.lg }}>
            The bill details are unavailable. Refresh the page or contact the property manager before submitting payment proof.
          </Text>
        )}

        {/* Payment Instructions */}
        <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
            <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>Payment Instructions</Text>
          </View>

          <View style={{ gap: 12 }}>
            {/* Cash */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cash-outline" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>Cash Payment</Text>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>Pay the landlord or property staff in person and ask for a receipt.</Text>
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: colors.bg, padding: 12, borderRadius: 8, marginTop: 14 }}>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, lineHeight: 18 }}>
              💡 After payment, notify the landlord with your reference number for faster processing.
            </Text>
          </View>
        </View>

        {/* Current Invoice Breakdown */}
        {billingBreakdown && billingBreakdown.totalDue > 0 && (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text, marginBottom: 14 }}>
              Current Invoice {billingBreakdown.month && `(${billingBreakdown.month})`}
            </Text>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>{billingBreakdown.invoiceType === 'initial' ? '1 Month Advance' : 'Monthly Rent'}</Text>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>₱{billingBreakdown.monthlyRent.toLocaleString()}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Electricity</Text>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>₱{billingBreakdown.electricity.toLocaleString()}</Text>
              </View>

              {(billingBreakdown.additionalCharges || []).map((charge, index) => (
                <View key={charge.id || `${charge.label}-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, fontSize: fs(14), color: colors.textSecondary }}>{charge.label || 'Additional charge'}</Text>
                  <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>₱{Number(charge.amount || 0).toLocaleString()}</Text>
                </View>
              ))}

              <View style={{ height: 1, backgroundColor: colors.cardBorder, marginVertical: 4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Total Due</Text>
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>₱{billingBreakdown.totalDue.toLocaleString()}</Text>
              </View>

              {billingBreakdown.paidAmount > 0 && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: fs(14), color: colors.successText }}>Paid</Text>
                    <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.successText }}>-₱{billingBreakdown.paidAmount.toLocaleString()}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Balance</Text>
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: balance > 0 ? colors.dangerText : colors.successText }}>
                      ₱{billingBreakdown.outstanding.toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {billingBreakdown.receiptNumber && (
              <View style={{ backgroundColor: colors.successBg, padding: 10, borderRadius: 8, marginTop: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: fs(12), color: colors.successText }}>Last Payment Receipt</Text>
                  <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.successText }}>{billingBreakdown.receiptNumber}</Text>
                </View>
                <Text style={{ fontSize: fs(11), color: colors.successText, marginTop: 2 }}>
                  Paid on {billingBreakdown.paymentDate}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Payment History */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginBottom: 12 }}>Payment History</Text>

          {/* Pending Payment Proofs */}
          {paymentProofs.filter((p) => p.status === 'pending').length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.warningText, marginBottom: 8 }}>⏳ Pending Verification</Text>
              {paymentProofs.filter((p) => p.status === 'pending').map((proof) => (
                <View
                  key={proof.id}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.warningBg,
                    borderColor: colors.warningText,
                    padding: 14,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="time-outline" size={20} color={colors.warningText} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>₱{proof.amount.toLocaleString()}</Text>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>
                        Submitted {new Date(proof.submittedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.warningText, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#ffffff' }}>PENDING</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Rejected Payment Proofs */}
          {paymentProofs.filter((p) => p.status === 'rejected').length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.dangerText, marginBottom: 8 }}>❌ Rejected</Text>
              {paymentProofs.filter((p) => p.status === 'rejected').map((proof) => (
                <View
                  key={proof.id}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.dangerBg,
                    borderColor: colors.dangerText,
                    padding: 14,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Ionicons name="close-circle" size={20} color={colors.dangerText} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>₱{proof.amount.toLocaleString()}</Text>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>
                        Submitted {new Date(proof.submittedAt).toLocaleDateString()}
                      </Text>
                      {proof.rejectionReason && (
                        <Text style={{ fontSize: fs(12), color: colors.dangerText, marginTop: 6, fontStyle: 'italic' }}>
                          Reason: {proof.rejectionReason}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {paymentHistory.length === 0 ? (
            <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 32, alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontSize: fs(15), fontWeight: '600', color: colors.text, marginTop: 12 }}>No Payments Yet</Text>
              <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                Your payment history will appear here.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {paymentHistory.map((payment) => (
                <View
                  key={payment.id}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.successBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={getMethodIcon(payment.method)} size={20} color={colors.successText} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>₱{payment.amount.toLocaleString()}</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>{formatDate(payment.date)}</Text>
                    {payment.referenceNo && (
                      <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>Ref: {payment.referenceNo}</Text>
                    )}
                  </View>

                  <View style={{ backgroundColor: colors.successBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ fontSize: fs(11), fontWeight: '700', color: colors.successText }}>PAID</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}
