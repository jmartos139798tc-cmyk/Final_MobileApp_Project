import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fs } from '../utils/responsive';
import { useTheme } from '../utils/ThemeContext';

export default function AnnouncementDetailsModal({ announcement, onClose }) {
  const { colors } = useTheme();

  return (
    <Modal visible={Boolean(announcement)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <View style={{ maxHeight: '80%', borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text, flex: 1, marginRight: 12 }}>Announcement</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close announcement" hitSlop={10}>
              <Ionicons name="close-circle" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {announcement && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={{ fontSize: fs(12), color: colors.accent, fontWeight: '800', textTransform: 'uppercase' }}>{announcement.category || 'Property update'}</Text>
              <Text style={{ marginTop: 8, fontSize: fs(22), lineHeight: fs(28), fontWeight: '900', color: colors.text }}>{announcement.title}</Text>
              <Text style={{ marginTop: 8, fontSize: fs(12), color: colors.textMuted }}>{announcement.date || announcement.created_at || 'Recently posted'}</Text>
              <Text style={{ marginTop: 18, fontSize: fs(15), lineHeight: 24, color: colors.textSecondary }}>{announcement.description}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
