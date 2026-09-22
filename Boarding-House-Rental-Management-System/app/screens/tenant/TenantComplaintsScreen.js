import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getTenantComplaints, submitComplaint } from '../../services/dataService';

export default function TenantComplaintsScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const [complaints, setComplaints] = useState(() => getTenantComplaints('Ana Reyes'));
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateComplaint = () => {
    if (!newTitle.trim()) return;
    const added = submitComplaint({
      title: newTitle.trim(),
      tenantName: 'Ana Reyes',
      room: 'Room 2',
    });
    setComplaints([added, ...complaints]);
    setNewTitle('');
    setNewDescription('');
    setModalVisible(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          text: colors.success,
          label: '● resolved',
        };
      case 'in-progress':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          text: colors.info,
          label: '● in progress',
        };
      case 'pending':
      default:
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          text: '#f59e0b',
          label: '● pending',
        };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 30,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          {/* Header */}
          <View style={{ padding, paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60 }}>
            <Text style={{
              fontSize: fs(28),
              color: colors.text,
              fontWeight: '800',
              letterSpacing: -0.5,
            }}>
              My Complaints
            </Text>
            {/* Small accent bar underline */}
            <View style={{
              width: 36,
              height: 3,
              backgroundColor: '#8b5cf6',
              borderRadius: 2,
              marginTop: 8,
              marginBottom: spacing.lg,
            }} />

            {/* + Submit New Complaint Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalVisible(true)}
              style={{
                width: '100%',
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#38bdf8',
                borderStyle: 'dashed',
                backgroundColor: 'rgba(56, 189, 248, 0.04)',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Text style={{
                fontSize: fs(14),
                fontWeight: '700',
                color: '#38bdf8',
              }}>
                + Submit New Complaint
              </Text>
            </TouchableOpacity>
          </View>

          {/* Complaints List */}
          <View style={{ paddingHorizontal: padding, gap: spacing.md }}>
            {complaints.length === 0 ? (
              <View style={{
                ...cardStyle,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                padding: 32,
                alignItems: 'center',
                marginTop: 20,
              }}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.success} />
                <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text, marginTop: 12 }}>
                  No complaints filed
                </Text>
                <Text style={{ fontSize: fs(13), color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                  Everything in your room is currently in good condition.
                </Text>
              </View>
            ) : (
              complaints.map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <View
                    key={item.id}
                    style={{
                      ...cardStyle,
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      padding: isMobile ? 18 : 22,
                    }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}>
                      <Text style={{
                        fontSize: fs(15),
                        fontWeight: '700',
                        color: colors.text,
                        flex: 1,
                        lineHeight: 22,
                      }}>
                        {item.title}
                      </Text>

                      {/* Status Pill */}
                      <View style={{
                        backgroundColor: badge.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{
                          fontSize: fs(11),
                          fontWeight: '800',
                          color: badge.text,
                        }}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Date */}
                    <Text style={{
                      fontSize: fs(12),
                      color: colors.textMuted,
                      marginTop: 8,
                      fontWeight: '500',
                    }}>
                      {item.date}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Submit Complaint Modal ──────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 24,
            ...cardShadow,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.text }}>
                Submit New Complaint
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: 8 }}>
              Filing for: Room 2 · Ana Reyes
            </Text>

            <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
              Issue Title *
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.searchBg,
                borderColor: colors.searchBorder,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: fs(14),
                color: colors.text,
                marginBottom: 14,
              }}
              placeholder="e.g. Leaking faucet, broken lightbulb..."
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
              Details (Optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.searchBg,
                borderColor: colors.searchBorder,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: fs(14),
                color: colors.text,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              placeholder="Provide any additional details or urgency..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={newDescription}
              onChangeText={setNewDescription}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.bg,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateComplaint}
                style={{
                  flex: 1,
                  backgroundColor: '#8b5cf6',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: fs(14), fontWeight: '800', color: '#ffffff' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

