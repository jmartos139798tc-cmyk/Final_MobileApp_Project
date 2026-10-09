import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { getPendingPaymentProofs, approvePaymentProof, rejectPaymentProof } from '../../services/dataService';

export default function PaymentProofReviewScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();

  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const loadProofs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingPaymentProofs();
      setProofs(data);
    } catch (err) {
      console.error('Error loading payment proofs:', err);
      setError('Failed to load payment proofs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProofs();
  }, []);

  const handleApprove = async (proofId) => {
    Alert.alert(
      'Approve Payment',
      'Verify that the payment proof is valid. This will record the payment and update the invoice.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessingId(proofId);
              await approvePaymentProof(proofId, 'current_user_id'); // Replace with actual user ID
              Alert.alert('Success', 'Payment verified and recorded successfully');
              await loadProofs();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to approve payment');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingId(selectedProof.id);
      await rejectPaymentProof(selectedProof.id, 'current_user_id', rejectionReason.trim());
      Alert.alert('Rejected', 'Payment proof has been rejected. The tenant has been notified.');
      setShowRejectModal(false);
      setSelectedProof(null);
      setRejectionReason('');
      await loadProofs();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reject payment');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (proof) => {
    setSelectedProof(proof);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getMethodLabel = (method) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      default:
        return method;
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return 'cash-outline';
      default:
        return 'wallet-outline';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 12 }}>Loading payment proofs...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28, alignItems: isDesktop ? 'center' : 'stretch' }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ paddingHorizontal: padding, paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60, paddingBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-done-outline" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '800' }}>Payment Verification</Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 2 }}>
                  {proofs.length} {proofs.length === 1 ? 'proof' : 'proofs'} awaiting review
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Proofs */}
          <View style={{ paddingHorizontal: padding, gap: spacing.md }}>
            {error && (
              <View style={{ backgroundColor: colors.dangerBg, padding: 14, borderRadius: 10 }}>
                <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
              </View>
            )}

            {proofs.length === 0 ? (
              <View
                style={{
                  ...cardStyle,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  padding: 40,
                  alignItems: 'center',
                }}
              >
                <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.success} />
                <Text style={{ fontSize: fs(17), fontWeight: '700', color: colors.text, marginTop: 16 }}>All Caught Up!</Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                  No payment proofs pending verification
                </Text>
              </View>
            ) : (
              proofs.map((proof) => {
                const isProcessing = processingId === proof.id;

                return (
                  <View
                    key={proof.id}
                    style={{
                      ...cardStyle,
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      padding: isMobile ? 16 : 20,
                      borderLeftWidth: 3,
                      borderLeftColor: colors.accent,
                    }}
                  >
                    {/* Tenant Info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: proof.tenantColor,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: fs(14) }}>{proof.tenantInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>{proof.tenantName}</Text>
                        <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Room {proof.roomNumber}</Text>
                      </View>
                      <View style={{ backgroundColor: colors.warningBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ fontSize: fs(11), fontWeight: '700', color: colors.warningText }}>PENDING</Text>
                      </View>
                    </View>

                    {/* Payment Details */}
                    <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Amount</Text>
                        <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.accent }}>₱{proof.amount.toLocaleString()}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Payment Date</Text>
                        <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>{formatDate(proof.paymentDate)}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Payment Method</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name={getMethodIcon(proof.paymentMethod)} size={16} color={colors.text} />
                          <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>{getMethodLabel(proof.paymentMethod)}</Text>
                        </View>
                      </View>

                      {proof.referenceNo && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Reference No.</Text>
                          <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>
                            {proof.referenceNo}
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>Invoice Period</Text>
                        <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text }}>{proof.invoicePeriod}</Text>
                      </View>
                    </View>

                    {/* Notes */}
                    {proof.notes && (
                      <View style={{ backgroundColor: colors.bg, padding: 12, borderRadius: 10, marginBottom: 14 }}>
                        <Text style={{ fontSize: fs(12), fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>NOTES</Text>
                        <Text style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 20 }}>{proof.notes}</Text>
                      </View>
                    )}

                    {/* Proof Image */}
                    {proof.proofImageUrl && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedProof(proof);
                          setShowImageModal(true);
                        }}
                        style={{
                          backgroundColor: colors.accentBg,
                          padding: 12,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <Ionicons name="image-outline" size={20} color={colors.accent} />
                        <Text style={{ flex: 1, fontSize: fs(14), fontWeight: '600', color: colors.accent }}>View Payment Proof</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.accent} />
                      </TouchableOpacity>
                    )}

                    {/* Submission Time */}
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: 14 }}>
                      Submitted {formatDate(proof.submittedAt)}
                    </Text>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => openRejectModal(proof)}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: colors.dangerText,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 6,
                          opacity: isProcessing ? 0.5 : 1,
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.dangerText} />
                        <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.dangerText }}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleApprove(proof.id)}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          backgroundColor: colors.accent,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 6,
                          opacity: isProcessing ? 0.5 : 1,
                        }}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                            <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#ffffff' }}>Approve & Record</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setShowImageModal(false)}
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>
          {selectedProof?.proofImageUrl && (
            <Image
              source={{ uri: selectedProof.proofImageUrl }}
              style={{ width: '90%', height: '70%', resizeMode: 'contain' }}
            />
          )}
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={() => setShowRejectModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: fs(18), fontWeight: '700', color: colors.text, marginBottom: 16 }}>Reject Payment Proof</Text>

            <Text style={{ fontSize: fs(14), fontWeight: '600', color: colors.text, marginBottom: 8 }}>Reason for Rejection *</Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Explain why this payment proof is rejected..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 10,
                padding: 12,
                fontSize: fs(15),
                color: colors.text,
                minHeight: 100,
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReject}
                disabled={processingId !== null}
                style={{
                  flex: 1,
                  backgroundColor: colors.dangerText,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: processingId !== null ? 0.5 : 1,
                }}
              >
                {processingId !== null ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#ffffff' }}>Reject Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
