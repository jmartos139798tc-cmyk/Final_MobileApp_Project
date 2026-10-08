import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getCurrentTenant, getTenantBillingBreakdown, getTenantPaymentHistory, getTenantPaymentProofs } from '../../services/dataService';
import SubmitPaymentProofModal from '../../components/tenant/SubmitPaymentProofModal';

export default function TenantFinancesScreen({ user }) {
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

  const loadFinancialData = async () => {
    try {
      setError(null);
      
      // Get tenant ID from user
      const tenantId = user?.tenant_id || user?.room || '2';
      
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
  };

  useEffect(() => {
    loadFinancialData();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFinancialData();
  }, [user]);

  const handleCopyText = (text, label) => {
    // In a real app, you'd use Clipboard API
    Alert.alert('Copied', `${label} copied to clipboard`, [{ text: 'OK' }]);
  };

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
      case 'gcash':
        return 'phone-portrait-outline';
      case 'bank_transfer':
        return 'business-outline';
      default:
        return 'wallet-outline';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 12 }}>Loading your finances...</Text>
      </View>
    );
  }

  if (error || !tenantInfo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: padding, paddingTop: safeAreaTop + 40 }}>
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

  const balance = tenantInfo.outstandingBalance || billingBreakdown?.outstanding || 0;
  const isOverdue = balance > 0 && billingBreakdown?.dueDate && new Date(billingBreakdown.dueDate) < new Date();
  
  const currentInvoice = billingBreakdown ? {
    id: billingBreakdown.invoiceId || 'current',
    period: billingBreakdown.month,
    outstanding: billingBreakdown.outstanding,
  } : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SubmitPaymentProofModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={currentInvoice}
        tenantId={user?.tenant_id || user?.room || '2'}
        onSuccess={loadFinancialData}
      />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: isMobile ? safeAreaTop + 16 : 40, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '700' }}>My Finances</Text>
          <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 4 }}>
            {tenantInfo.roomNumber ? `Room ${tenantInfo.roomNumber}` : 'Your financial overview'}
          </Text>
        </View>

        {/* Current Balance Card */}
        <View
          style={{
            ...cardStyle,
            backgroundColor: balance > 0 ? colors.dangerBg : colors.successBg,
            borderColor: balance > 0 ? colors.dangerText : colors.successText,
            padding: 20,
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ fontSize: fs(14), color: balance > 0 ? colors.dangerText : colors.successText, marginBottom: 8 }}>
            Current Balance
          </Text>
          <Text style={{ fontSize: fs(36), fontWeight: '700', color: balance > 0 ? colors.dangerText : colors.successText }}>
            ₱{balance.toLocaleString()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Ionicons
              name={balance > 0 ? (isOverdue ? 'alert-circle' : 'time-outline') : 'checkmark-circle'}
              size={18}
              color={balance > 0 ? colors.dangerText : colors.successText}
            />
            <Text style={{ fontSize: fs(14), fontWeight: '600', color: balance > 0 ? colors.dangerText : colors.successText }}>
              {balance === 0 ? 'All Paid Up!' : isOverdue ? `OVERDUE - Due: ${billingBreakdown?.dueDate}` : `Due: ${billingBreakdown?.dueDate || 'TBD'}`}
            </Text>
          </View>
        </View>

        {/* Submit Payment Button */}
        {balance > 0 && (
          <TouchableOpacity
            onPress={() => setShowPaymentModal(true)}
            style={{
              backgroundColor: colors.accent,
              padding: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: spacing.lg,
            }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
            <Text style={{ fontSize: fs(16), fontWeight: '700', color: '#ffffff' }}>Submit Payment Proof</Text>
          </TouchableOpacity>
        )}

        {/* Payment Instructions */}
        <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
            <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>Payment Instructions</Text>
          </View>

          <View style={{ gap: 12 }}>
            {/* GCash */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>GCash</Text>
                <TouchableOpacity onPress={() => handleCopyText('09171234567', 'GCash number')}>
                  <Text style={{ fontSize: fs(13), color: colors.accent, marginTop: 2 }}>09171234567 (Tap to copy)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bank Transfer */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="business-outline" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>Bank Transfer</Text>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>BDO: 1234567890</Text>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Account Name: Property Owner</Text>
              </View>
            </View>

            {/* Cash */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cash-outline" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>Cash Payment</Text>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 2 }}>Office hours: Mon-Fri, 9:00 AM - 5:00 PM</Text>
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
                <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Monthly Rent</Text>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>₱{billingBreakdown.monthlyRent.toLocaleString()}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Electricity</Text>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>₱{billingBreakdown.electricity.toLocaleString()}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Water</Text>
                <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>{billingBreakdown.water}</Text>
              </View>

              {billingBreakdown.receiptAmount > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary }}>Security Deposit</Text>
                  <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>₱{billingBreakdown.receiptAmount.toLocaleString()}</Text>
                </View>
              )}

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

        {/* Security Deposit Info */}
        {tenantInfo.outstandingBalance !== undefined && (
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16 }}>
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>Security Deposit</Text>
            <Text style={{ fontSize: fs(13), color: colors.textSecondary, lineHeight: 20 }}>
              Your security deposit will be refunded at the end of your lease, minus any deductions for damages or unpaid balances.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
