import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, fs } from '../../utils/responsive';
import { rejectTenant } from '../../services/dataService';

export default function TenantRejectionModal({ visible, tenant, onClose, onSuccess }) {
  const { colors } = useTheme();

  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const presetReasons = {
    no_rooms: 'No More Room Available',
    maintenance: 'Under Maintenance',
  };
  const rejectionReason = selectedReason === 'custom'
    ? customReason
    : presetReasons[selectedReason] || '';

  useEffect(() => {
    if (!visible) return;
    setSelectedReason('');
    setCustomReason('');
    setError('');
    setConfirmationVisible(false);
  }, [visible, tenant?.tenantId]);

  const handleReject = async () => {
    try {
      setError('');

      const reason = rejectionReason.trim();
      if (!reason) {
        setError('Please provide a reason for rejection');
        return;
      }

      if (reason.length < 10) {
        setError('Reason must be at least 10 characters');
        return;
      }

      setConfirmationVisible(true);
    } catch (err) {
      console.error('Validation error:', err);
      setError('An error occurred. Please try again.');
    }
  };

  const confirmRejection = async () => {
    setSubmitting(true);
    setError('');
    try {
      await rejectTenant({
        tenantId: tenant.tenantId,
        rejectionReason: rejectionReason.trim(),
      });
      setSelectedReason('');
      setCustomReason('');
      setConfirmationVisible(false);
      onSuccess?.();
    } catch (err) {
      console.error('Rejection error:', err);
      setError(err.message || 'Failed to reject tenant. Please try again.');
      setConfirmationVisible(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !submitting && onClose()}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        onPress={() => !submitting && onClose()}
      >
        <Pressable
          style={{
            width: isMobile ? '90%' : 480,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: fs(20), fontWeight: '800', color: colors.text }}>Reject Application</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tenant Info */}
          <View
            style={{
              backgroundColor: colors.bg,
              padding: 12,
              borderRadius: 12,
              marginBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: tenant.color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: fs(16), fontWeight: '800', color: '#fff' }}>{tenant.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text }}>{tenant.name}</Text>
              <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>{tenant.phone}</Text>
            </View>
          </View>

          {/* Warning */}
          <View
            style={{
              backgroundColor: colors.infoBg,
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <Ionicons name="alert-circle" size={20} color={colors.infoText} />
            <Text style={{ fontSize: fs(13), color: colors.infoText, flex: 1 }}>
              The applicant will be notified of this decision.
            </Text>
          </View>

          {/* Error Display */}
          {!!error && (
            <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

          {confirmationVisible ? (
            <>
              <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>
                  Reject {tenant.name}'s application?
                </Text>
                <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
                  Reason: {rejectionReason.trim()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setConfirmationVisible(false)}
                  disabled={submitting}
                  style={{ flex: 1, minHeight: 48, backgroundColor: colors.dangerText, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Go back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={confirmRejection}
                  disabled={submitting}
                  style={{ flex: 1, minHeight: 48, backgroundColor: colors.successText, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                >
                  {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Confirm rejection</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                Reason for Rejection <Text style={{ color: colors.dangerText }}>*</Text>
              </Text>
              <ScrollView style={{ maxHeight: 145, marginBottom: 10 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                {[
                  { value: 'no_rooms', label: 'No More Room Available', icon: 'bed-outline' },
                  { value: 'maintenance', label: 'Under Maintenance', icon: 'construct-outline' },
                  { value: 'custom', label: 'Other reason', icon: 'create-outline' },
                ].map((option) => {
                  const selected = selectedReason === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => { setSelectedReason(option.value); setError(''); }}
                      disabled={submitting}
                      style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 7, backgroundColor: selected ? colors.accentBg : colors.bg, borderColor: selected ? colors.accent : colors.cardBorder, borderWidth: 1, borderRadius: 9 }}
                    >
                      <Ionicons name={option.icon} size={18} color={selected ? colors.accent : colors.textSecondary} />
                      <Text style={{ flex: 1, color: colors.text, fontSize: fs(14), fontWeight: selected ? '700' : '500' }}>{option.label}</Text>
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={19} color={selected ? colors.accent : colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {selectedReason === 'custom' && (
              <TextInput
                value={customReason}
                onChangeText={(value) => {
                  setCustomReason(value);
                  setError('');
                }}
                placeholder="Type the reason for rejection"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
                editable={!submitting}
                style={{
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: fs(15),
                  color: colors.text,
                  marginBottom: 4,
                  minHeight: 100,
                }}
              />
              )}
              <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: 20 }}>
                {rejectionReason.length}/500 characters · at least 10 required
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={onClose}
                  disabled={submitting}
                  style={{ flex: 1, backgroundColor: colors.dangerText, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={handleReject}
                  disabled={submitting || !rejectionReason.trim()}
                  style={{ flex: 1, backgroundColor: !rejectionReason.trim() ? colors.textMuted : colors.successText, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Rejected</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
