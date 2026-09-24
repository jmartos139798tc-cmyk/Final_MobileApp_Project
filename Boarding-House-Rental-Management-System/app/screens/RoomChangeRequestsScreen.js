import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, safeAreaTop } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';
import { getRoomChangeRequests, reviewRoomChangeRequest } from '../services/dataService';

export default function RoomChangeRequestsScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const [requests, setRequests] = useState(() => getRoomChangeRequests());
  const [filter, setFilter] = useState('All');
  const [notice, setNotice] = useState('');
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const filteredRequests = useMemo(() => requests.filter((request) => filter === 'All' || request.status === filter.toLowerCase()), [filter, requests]);
  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  const reviewRequest = (id, decision) => {
    try {
      const updated = reviewRoomChangeRequest(id, decision);
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
      setNotice(decision === 'approved' ? 'Request approved and tenant room assignment updated.' : 'Request declined. The tenant remains in their current room.');
    } catch (error) {
      setNotice(error.message || 'Unable to update this request.');
    }
  };

  const statusStyle = (status) => status === 'approved'
    ? { bg: colors.successBg, color: colors.successText, label: 'Approved' }
    : status === 'declined'
      ? { bg: 'rgba(239, 68, 68, 0.15)', color: colors.danger, label: 'Declined' }
      : { bg: colors.warningBg, color: colors.warningText, label: 'Pending' };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28, alignItems: isDesktop ? 'center' : 'stretch' }}>
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <View style={{ paddingHorizontal: padding, paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60, paddingBottom: spacing.md }}>
            <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: '600' }}>{pendingCount} awaiting review</Text>
            <Text style={{ fontSize: fs(30), color: colors.text, fontWeight: '800', marginTop: 4 }}>Room Changes</Text>
            <Text style={{ fontSize: fs(13), color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}>Review tenant transfer requests. Approving a request moves the active lease to the selected vacant room.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 16 }}>
              {['All', 'Pending', 'Approved', 'Declined'].map((item) => {
                const active = filter === item;
                return <TouchableOpacity key={item} activeOpacity={0.75} onPress={() => setFilter(item)} style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, backgroundColor: active ? colors.accent : colors.filterBg, borderWidth: 1, borderColor: active ? colors.accent : colors.filterBorder }}>
                  <Text style={{ color: active ? '#ffffff' : colors.textSecondary, fontSize: fs(12), fontWeight: '700' }}>{item}</Text>
                </TouchableOpacity>;
              })}
            </ScrollView>
          </View>

          <View style={{ paddingHorizontal: padding, gap: spacing.md }}>
            {!!notice && <View style={{ backgroundColor: colors.accentBg, borderRadius: 10, padding: 12 }}><Text style={{ color: colors.accent, fontSize: fs(12), fontWeight: '600' }}>{notice}</Text></View>}

            {filteredRequests.map((request) => {
              const status = statusStyle(request.status);
              return <View key={request.id} style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: isMobile ? 17 : 22, borderLeftWidth: 3, borderLeftColor: request.status === 'pending' ? colors.warning : status.color }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: request.color, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#ffffff', fontWeight: '800', fontSize: fs(13) }}>{request.initials}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: fs(16) }}>{request.tenant}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: fs(12), marginTop: 3 }}>Submitted {request.date}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: status.bg, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: status.color, fontWeight: '800', fontSize: fs(11) }}>{status.label}</Text></View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18, backgroundColor: colors.bg, borderRadius: 12, padding: 13 }}>
                  <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted, fontSize: fs(10), fontWeight: '800', letterSpacing: 0.7 }}>CURRENT</Text><Text style={{ color: colors.text, fontSize: fs(15), fontWeight: '800', marginTop: 3 }}>Room {request.currentRoom}</Text></View>
                  <Ionicons name="arrow-forward" size={19} color={colors.accent} />
                  <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted, fontSize: fs(10), fontWeight: '800', letterSpacing: 0.7 }}>REQUESTED</Text><Text style={{ color: colors.accent, fontSize: fs(15), fontWeight: '800', marginTop: 3 }}>Room {request.requestedRoom}</Text><Text style={{ color: colors.textMuted, fontSize: fs(11), marginTop: 2 }}>{request.requestedRoomType}</Text></View>
                </View>

                <Text style={{ color: colors.textSecondary, fontSize: fs(13), lineHeight: 20, marginTop: 14 }}>{request.reason}</Text>

                {request.status === 'pending' && <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => reviewRequest(request.id, 'declined')} style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}><Ionicons name="close-circle-outline" size={18} color={colors.danger} /><Text style={{ color: colors.danger, fontSize: fs(13), fontWeight: '800' }}>Decline</Text></TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => reviewRequest(request.id, 'approved')} style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}><Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" /><Text style={{ color: '#ffffff', fontSize: fs(13), fontWeight: '800' }}>Approve</Text></TouchableOpacity>
                </View>}
              </View>;
            })}

            {filteredRequests.length === 0 && <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 30, alignItems: 'center' }}><Ionicons name="checkmark-done-circle-outline" size={42} color={colors.success} /><Text style={{ color: colors.text, fontSize: fs(15), fontWeight: '700', marginTop: 10 }}>No {filter.toLowerCase()} room changes</Text></View>}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
