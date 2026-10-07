import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import {
  getAvailableRoomsForChange,
  getTenantRoomChangeRequests,
  submitRoomChangeRequest,
  getCurrentTenant,
} from '../../services/dataService';

export default function TenantRoomChangeScreen({ user }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const [availableRooms, setAvailableRooms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const containerMaxWidth = isDesktop ? 1180 : '100%';

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [rooms, reqs, tenantProfile] = await Promise.all([
        getAvailableRoomsForChange(),
        getTenantRoomChangeRequests(user?.tenant_id),
        getCurrentTenant(user?.tenant_id),
      ]);
      setAvailableRooms(rooms);
      setRequests(reqs);
      setTenant(tenantProfile);
    } catch (err) {
      setError('Failed to load room change data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.tenant_id]);

  const submitRequest = async () => {
    if (!selectedRoomId) {
      setError('Please select an available room.');
      return;
    }
    if (!reason.trim()) {
      setError('Please tell us why you would like to change rooms.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const request = await submitRoomChangeRequest({
        requestedRoomId: selectedRoomId,
        reason: reason.trim(),
        tenantId: user?.tenant_id,
      });
      setRequests((current) => [request, ...current]);
      setSelectedRoomId(null);
      setReason('');
      setError('Your room-change request has been submitted for review.');
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const badge = (status) => status === 'approved'
    ? { label: 'Approved', color: colors.successText, bg: colors.successBg }
    : status === 'declined'
      ? { label: 'Declined', color: colors.dangerText, bg: colors.dangerBg }
      : { label: 'Pending review', color: colors.warningText, bg: colors.warningBg };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, alignItems: isDesktop ? 'center' : 'stretch' }} showsVerticalScrollIndicator={false}>
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <View style={{ padding, paddingTop: isMobile ? safeAreaTop + 62 : isDesktop ? 68 : 64, paddingBottom: 20 }}>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 5 }}>TENANT PORTAL</Text>
            <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '900', letterSpacing: -0.5 }}>Room change</Text>
            <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 6, lineHeight: 21 }}>
              Request a transfer to an available room. Your current room stays assigned until your request is approved.
            </Text>
            {!!tenant?.roomNumber && (
              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.accentBg }}>
                <Ionicons name="bed-outline" size={16} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: fs(13), fontWeight: '700' }}>Current room: {tenant.roomNumber}</Text>
              </View>
            )}
            {error === 'Failed to load room change data.' && (
              <TouchableOpacity onPress={loadData} style={{ alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10 }}>
                <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Reload room options</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: isMobile ? 18 : 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="swap-horizontal" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fs(17), color: colors.text, fontWeight: '800' }}>Request a room transfer</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 3, lineHeight: 19 }}>Choose a vacant room. The owner will review your request.</Text>
                </View>
              </View>

              <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '700', marginBottom: 9 }}>Choose an available room *</Text>
              <View style={{ gap: 10 }}>
                {availableRooms.length === 0 ? (
                  <Text style={{ fontSize: fs(13), color: colors.textMuted, fontStyle: 'italic', paddingVertical: 8 }}>
                    No vacant rooms are available for transfer right now. Check again later.
                  </Text>
                ) : (
                  availableRooms.map((room) => {
                    const selected = selectedRoomId === room.id;
                    return (
                      <TouchableOpacity key={room.id} activeOpacity={0.75} onPress={() => { setSelectedRoomId(room.id); setError(''); }} style={{
                        borderWidth: 1.5, borderColor: selected ? colors.accent : colors.cardBorder, backgroundColor: selected ? colors.accentBg : colors.bg,
                        borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 66,
                      }}>
                        <View>
                          <Text style={{ fontSize: fs(16), color: colors.text, fontWeight: '800' }}>Room {room.number}</Text>
                          <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 3 }}>{room.type} · ₱{room.monthlyRent.toLocaleString()}/month</Text>
                        </View>
                        <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected ? colors.accent : colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <Text style={{ fontSize: fs(14), color: colors.textSecondary, fontWeight: '700', marginTop: 18, marginBottom: 7 }}>Reason for transfer *</Text>
              <TextInput
                value={reason}
                onChangeText={(value) => { setReason(value); setError(''); }}
                placeholder="Tell the owner why you need to move..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 92, backgroundColor: colors.searchBg, borderWidth: 1, borderColor: colors.searchBorder, borderRadius: 12, padding: 13, color: colors.text, fontSize: fs(15) }}
              />

              {!!error && <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 11, borderRadius: 12, backgroundColor: error.startsWith('Your') ? colors.successBg : colors.dangerBg }}>
                <Ionicons name={error.startsWith('Your') ? 'checkmark-circle' : 'alert-circle'} size={17} color={error.startsWith('Your') ? colors.successText : colors.dangerText} />
                <Text style={{ flex: 1, fontSize: fs(13), color: error.startsWith('Your') ? colors.successText : colors.dangerText, lineHeight: 19, fontWeight: '600' }}>{error}</Text>
              </View>}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={submitting ? undefined : submitRequest}
                accessibilityState={{ disabled: submitting }}
                style={{ pointerEvents: submitting ? 'none' : 'auto', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 18, minHeight: 48, justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={{ fontSize: fs(15), fontWeight: '800', color: colors.onPrimary }}>Submit Room Change Request</Text>
                )}
              </TouchableOpacity>
            </View>

            <View>
              <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.text, marginBottom: 10 }}>My requests</Text>
              {requests.length === 0 ? (
                <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                  <Ionicons name="bed-outline" size={34} color={colors.textMuted} />
                  <Text style={{ fontSize: fs(15), color: colors.textSecondary, marginTop: 10 }}>No room-change requests yet.</Text>
                </View>
              ) : requests.map((request) => {
                const status = badge(request.status);
                return (
                  <View key={request.id} style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(16), color: colors.text, fontWeight: '800' }}>Room {request.roomNumber} · {request.roomType}</Text>
                        <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}>{request.reason}</Text>
                      </View>
                      <View style={{ backgroundColor: status.bg, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: fs(12), color: status.color, fontWeight: '800' }}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 10 }}>Submitted {request.date}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
