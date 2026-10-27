import ScreenSkeleton from '../../components/ScreenSkeleton';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { getResponsivePadding, fs, spacing, cardStyle, isMobile } from '../../utils/responsive';
import {
  approvePaymentProof,
  getPendingPaymentProofs,
} from '../../services/dataService';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const PAYMENT_ITEM_LABELS = {
  rent: 'Rent',
  electricity: 'Electricity',
  water: 'Water',
  wifi: 'Wi-Fi',
  other: 'Other charges',
  unallocated: 'Invoice balance',
};

export default function PaymentReviewScreen({ user, navigation }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [processingProofId, setProcessingProofId] = useState(null);
  const [viewingProof, setViewingProof] = useState(null);
  const [confirmingProof, setConfirmingProof] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const loadProofs = useCallback(async (isRefresh = false) => {
    try {
      setError('');
      if (isRefresh) setRefreshing(true);
      const pendingProofs = await getPendingPaymentProofs();
      setProofs(pendingProofs);
    } catch (loadError) {
      console.error('Error loading payment proofs for review:', loadError);
      setError('Failed to load payment proofs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProofs();
  }, [loadProofs]);

  useRealtimeRefresh('landlord-payment-proof-review', [
    { table: 'payment_proofs' },
    { table: 'payments' },
  ], () => {
    loadProofs(true).catch((refreshError) => {
      console.warn('Could not refresh payment proofs:', refreshError.message || refreshError);
    });
  });

  const handleApprove = async (proof) => {
    try {
      setProcessingProofId(proof.id);
      setError('');
      await approvePaymentProof(proof.id, user?.uid);
      setConfirmingProof(null);
      setViewingProof(null);
      await loadProofs();
    } catch (approveError) {
      console.error('Error approving payment proof:', approveError);
      setError(approveError.message || 'Could not approve this payment proof.');
    } finally {
      setProcessingProofId(null);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <ScreenSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingTop: isMobile ? 16 : 32,
          paddingBottom: spacing.lg,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadProofs(true)} tintColor={colors.accent} />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to Tenant Finances"
            onPress={() => navigation?.goBack()}
            style={{
              width: 42,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '700' }}>Payment Review</Text>
            <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 3 }}>
              Review tenant-submitted payment proofs
            </Text>
          </View>
        </View>

        {error ? (
          <View style={{
            ...cardStyle,
            backgroundColor: colors.dangerBg,
            borderColor: colors.dangerText,
            padding: 16,
            marginBottom: spacing.md,
          }}>
            <Text style={{ color: colors.dangerText, fontSize: fs(14), fontWeight: '600' }}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => loadProofs(true)}
              style={{ alignSelf: 'flex-start', paddingTop: 12 }}
            >
              <Text style={{ color: colors.dangerText, fontSize: fs(14), fontWeight: '700' }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {proofs.length === 0 && !error ? (
          <View style={{
            ...cardStyle,
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            padding: 36,
            alignItems: 'center',
          }}>
            <Ionicons name="checkmark-done-circle-outline" size={54} color={colors.textMuted} />
            <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text, marginTop: 12 }}>
              No payment proofs to review
            </Text>
            <Text style={{ fontSize: fs(14), color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>
              New tenant submissions will appear here.
            </Text>
          </View>
        ) : proofs.map((proof) => (
            <View
              key={proof.id}
              style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                padding: 16,
                marginBottom: spacing.md,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text }}>{proof.tenantName}</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 3 }}>
                    Room {proof.roomNumber} · {proof.invoicePeriod}
                  </Text>
                  <Text style={{ fontSize: fs(12), color: colors.accent, fontWeight: '600', marginTop: 3 }}>
                    Item: {PAYMENT_ITEM_LABELS[proof.chargeType] || PAYMENT_ITEM_LABELS.unallocated}
                  </Text>
                </View>
                <Text style={{ fontSize: fs(17), fontWeight: '800', color: colors.accent }}>
                  ₱{Number(proof.amount || 0).toLocaleString()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>
                  Paid {formatDate(proof.paymentDate)}
                </Text>
                <Text style={{ fontSize: fs(12), fontWeight: '700', color: proof.needsRecording ? colors.warningText : colors.accent }}>
                  {proof.needsRecording ? 'Approved · not recorded' : 'Pending review'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`View payment proof details for ${proof.tenantName}`}
                  onPress={() => setViewingProof(proof)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 7,
                    borderWidth: 1,
                    borderColor: colors.accent,
                  }}
                >
                  <Ionicons name="eye-outline" size={18} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: fs(14), fontWeight: '700' }}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Record payment for ${proof.tenantName}`}
                  disabled={processingProofId === proof.id}
                  onPress={() => setConfirmingProof(proof)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.accent,
                    opacity: processingProofId === proof.id ? 0.6 : 1,
                  }}
                >
                  {processingProofId === proof.id ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '700' }}>Record Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
        ))}
      </ScrollView>

      <Modal
        visible={Boolean(viewingProof)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingProof(null)}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={{ ...cardStyle, maxHeight: '90%', backgroundColor: colors.card, borderColor: colors.cardBorder, overflow: 'hidden' }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(21), fontWeight: '700', color: colors.text }}>Payment Details</Text>
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 4 }}>
                    {viewingProof?.tenantName} · Room {viewingProof?.roomNumber}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close payment details"
                  onPress={() => setViewingProof(null)}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {viewingProof ? (
                <>
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    <Text style={{ color: colors.text, fontSize: fs(16), fontWeight: '700' }}>
                      Amount: ₱{Number(viewingProof.amount || 0).toLocaleString()}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fs(14) }}>
                      Invoice period: {viewingProof.invoicePeriod}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fs(14) }}>
                      Invoice item: {PAYMENT_ITEM_LABELS[viewingProof.chargeType] || PAYMENT_ITEM_LABELS.unallocated}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fs(14) }}>
                      Payment date: {formatDate(viewingProof.paymentDate)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fs(14) }}>
                      Method: {viewingProof.paymentMethod || '—'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fs(14) }}>
                      Reference: {viewingProof.referenceNo || '—'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fs(14) }}>
                      Submitted: {formatDate(viewingProof.submittedAt)}
                    </Text>
                    {viewingProof.notes ? (
                      <Text style={{ color: colors.text, fontSize: fs(14) }}>Notes: {viewingProof.notes}</Text>
                    ) : null}
                  </View>

                  {viewingProof.proofImageUrl ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Enlarge payment proof from ${viewingProof.tenantName}`}
                      onPress={() => setPreviewUrl(viewingProof.proofImageUrl)}
                      style={{ marginBottom: 16 }}
                    >
                      <Image
                        source={{ uri: viewingProof.proofImageUrl }}
                        resizeMode="cover"
                        style={{ width: '100%', height: 240, borderRadius: 10, backgroundColor: colors.bg }}
                      />
                      <Text style={{ color: colors.accent, fontSize: fs(12), fontWeight: '700', marginTop: 5 }}>
                        Tap image to enlarge
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ padding: 14, backgroundColor: colors.bg, borderRadius: 10, marginBottom: 16 }}>
                      <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>No proof image available.</Text>
                    </View>
                  )}

                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(confirmingProof)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingProof(null)}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 22 }}>
            <Ionicons name="alert-circle-outline" size={34} color={colors.warningText} />
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text, marginTop: 10 }}>
              Confirm payment approval
            </Text>
            <Text style={{ fontSize: fs(14), lineHeight: 21, color: colors.textSecondary, marginTop: 8 }}>
              Record {confirmingProof?.tenantName}&apos;s payment of ₱{Number(confirmingProof?.amount || 0).toLocaleString()} for Room {confirmingProof?.roomNumber}? This will approve the proof and record the payment.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setConfirmingProof(null)}
                disabled={Boolean(processingProofId)}
                style={{ flex: 1, minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: colors.text, fontSize: fs(14), fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Confirm and record payment"
                onPress={() => confirmingProof && handleApprove(confirmingProof)}
                disabled={!confirmingProof || Boolean(processingProofId)}
                style={{ flex: 1, minHeight: 46, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: processingProofId ? 0.7 : 1 }}
              >
                {processingProofId ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '700' }}>Confirm Approval</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(previewUrl)} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close payment proof"
            onPress={() => setPreviewUrl(null)}
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 1, padding: 10 }}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} resizeMode="contain" style={{ width: '100%', height: '80%' }} />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
