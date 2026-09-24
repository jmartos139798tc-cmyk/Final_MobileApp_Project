import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import {
  getAvailableRoomsForChange,
  getTenantRoomChangeRequests,
  submitRoomChangeRequest,
} from '../../services/dataService';

export default function TenantRoomChangeScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const [availableRooms] = useState(() => getAvailableRoomsForChange());
  const [requests, setRequests] = useState(() => getTenantRoomChangeRequests('Ana Reyes'));
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const submitRequest = () => {
    if (!selectedRoomId) {
      setError('Please select an available room.');
      return;
    }
    if (!reason.trim()) {
      setError('Please tell us why you would like to change rooms.');
      return;
    }

    try {
      const request = submitRoomChangeRequest({
        requestedRoomId: selectedRoomId,
        reason: reason.trim(),
        tenantName: 'Ana Reyes',
      });
      setRequests((current) => [request, ...current]);
      setSelectedRoomId(null);
      setReason('');
      setError('Your room-change request has been submitted for review.');
    } catch (submissionError) {
      setError(submissionError.message || 'Unable to submit your request. Please try again.');
    }
  };

  const badge = (status) => status === 'approved'
    ? { label: 'Approved', color: colors.success, bg: 'rgba(16, 185, 129, 0.15)' }
    : status === 'declined'
      ? { label: 'Declined', color: colors.danger, bg: 'rgba(239, 68, 68, 0.15)' }
      : { label: 'Pending review', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, alignItems: isDesktop ? 'center' : 'stretch' }} showsVerticalScrollIndicator={false}>
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <View style={{ padding, paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60 }}>
            <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '800', letterSpacing: -0.5 }}>Room Change</Text>
            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}>
              Request a transfer to an available room. Your current room stays assigned until your request is approved.
            </Text>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.lg }}>
            <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: isMobile ? 18 : 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(139, 92, 246, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="swap-horizontal" size={21} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={{ fontSize: fs(16), color: colors.text, fontWeight: '800' }}>New room request</Text>
                  <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>Current room: Room 2</Text>
                </View>
              </View>

              <Text style={{ fontSize: fs(13), color: colors.textSecondary, fontWeight: '700', marginBottom: 9 }}>Choose an available room *</Text>
              <View style={{ gap: 10 }}>
                {availableRooms.map((room) => {
                  const selected = selectedRoomId === room.id;
                  return (
                    <TouchableOpacity key={room.id} activeOpacity={0.75} onPress={() => { setSelectedRoomId(room.id); setError(''); }} style={{
                      borderWidth: 1.5, borderColor: selected ? '#8b5cf6' : colors.cardBorder, backgroundColor: selected ? 'rgba(139, 92, 246, 0.10)' : colors.bg,
                      borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <View>
                        <Text style={{ fontSize: fs(15), color: colors.text, fontWeight: '800' }}>Room {room.number}</Text>
                        <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 3 }}>{room.type} · ₱{room.monthlyRent.toLocaleString()}/month</Text>
                      </View>
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? '#8b5cf6' : colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ fontSize: fs(13), color: colors.textSecondary, fontWeight: '700', marginTop: 18, marginBottom: 7 }}>Reason for transfer *</Text>
              <TextInput
                value={reason}
                onChangeText={(value) => { setReason(value); setError(''); }}
                placeholder="Tell the caretaker why you need to move..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 92, backgroundColor: colors.searchBg, borderWidth: 1, borderColor: colors.searchBorder, borderRadius: 12, padding: 13, color: colors.text, fontSize: fs(14) }}
              />

              {!!error && <Text style={{ fontSize: fs(12), color: error.startsWith('Your') ? colors.success : colors.danger, marginTop: 10, fontWeight: '600' }}>{error}</Text>}
              <TouchableOpacity activeOpacity={0.8} onPress={submitRequest} style={{ backgroundColor: '#8b5cf6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 }}>
                <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#ffffff' }}>Submit Room Change Request</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text style={{ fontSize: fs(11), fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>My requests</Text>
              {requests.length === 0 ? (
                <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                  <Ionicons name="bed-outline" size={34} color={colors.textMuted} />
                  <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 10 }}>No room-change requests yet.</Text>
                </View>
              ) : requests.map((request) => {
                const status = badge(request.status);
                return (
                  <View key={request.id} style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fs(15), color: colors.text, fontWeight: '800' }}>Room {request.roomNumber} · {request.roomType}</Text>
                        <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 6, lineHeight: 19 }}>{request.reason}</Text>
                      </View>
                      <View style={{ backgroundColor: status.bg, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: fs(11), color: status.color, fontWeight: '800' }}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 10 }}>Submitted {request.date}</Text>
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
