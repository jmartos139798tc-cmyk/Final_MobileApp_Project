import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { isMobile, fs } from '../../utils/responsive';
import { rejectTenant } from '../../services/dataService';

export default function TenantRejectionModal({ visible, tenant, onClose, onSuccess }) {
  const { colors } = useTheme();

  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

      // Confirm rejection
      Alert.alert(
        'Confirm Rejection',
        `Reject ${tenant.name}?\n\nReason: ${reason}\n\nThis action will notify the applicant.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              setSubmitting(true);
              try {
                await rejectTenant({
                  tenantId: tenant.tenantId,
                  rejectionReason: reason,
                });

                Alert.alert('Rejected', `${tenant.name}'s application has been rejected.`, [
                  {
                    text: 'OK',
                    onPress: () => {
                      setRejectionReason('');
                      onSuccess();
                    },
                  },
                ]);
              } catch (err) {
                console.error('Rejection error:', err);
                setError(err.message || 'Failed to reject tenant. Please try again.');
                setSubmitting(false);
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('Validation error:', err);
      setError('An error occurred. Please try again.');
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
              backgroundColor: colors.dangerBg,
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <Ionicons name="alert-circle" size={20} color={colors.dangerText} />
            <Text style={{ fontSize: fs(13), color: colors.dangerText, flex: 1 }}>
              The applicant will be notified of this decision.
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={{ backgroundColor: colors.dangerBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: fs(14), color: colors.dangerText, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

          {/* Rejection Reason */}
          <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            Reason for Rejection <Text style={{ color: colors.dangerText }}>*</Text>
          </Text>
          <TextInput
            value={rejectionReason}
            onChangeText={(v) => {
              setRejectionReason(v);
              setError('');
            }}
            placeholder="e.g., No available rooms at this time, incomplete documentation, etc."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
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
          <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: 20 }}>
            {rejectionReason.length}/500 characters
          </Text>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                backgroundColor: colors.bg,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReject}
              disabled={submitting || !rejectionReason.trim()}
              style={{
                flex: 1,
                backgroundColor: !rejectionReason.trim() ? colors.textMuted : colors.dangerText,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: '#fff' }}>Reject Application</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
