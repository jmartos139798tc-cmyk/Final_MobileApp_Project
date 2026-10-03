import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow, safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getTenantComplaints, submitComplaint } from '../../services/dataService';

export default function TenantComplaintsScreen({ user }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTenantComplaints(user?.tenant_id);
      setComplaints(data);
    } catch (err) {
      setError('Failed to load your complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [user?.tenant_id]);

  const handleCreateComplaint = async () => {
    if (!newTitle.trim()) {
      setSubmitError('Please enter an issue title.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');
      const added = await submitComplaint({
        title: newTitle.trim(),
        description: newDescription.trim(),
        tenantId: user?.tenant_id,
      });
      setComplaints((prev) => [added, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setModalVisible(false);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return {
          bg: colors.successBg,
          text: colors.successText,
          label: '● resolved',
        };
      case 'in-progress':
        return {
          bg: colors.infoBg,
          text: colors.infoText,
          label: '● in progress',
        };
      case 'pending':
      default:
        return {
          bg: colors.warningBg,
          text: colors.warningText,
          label: '● pending',
        };
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Text style={{ color: colors.danger, fontSize: fs(16), textAlign: 'center', fontWeight: '600' }}>
          {error}
        </Text>
      </View>
    );
  }

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
            <View style={{
              width: 36,
              height: 3,
              backgroundColor: colors.accent,
              borderRadius: 2,
              marginTop: 8,
              marginBottom: spacing.lg,
            }} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setSubmitError('');
                setModalVisible(true);
              }}
              style={{
                width: '100%',
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.accent,
                borderStyle: 'dashed',
                backgroundColor: colors.accentBg,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                minHeight: 48,
              }}
            >
              <Text style={{
                fontSize: fs(15),
                fontWeight: '700',
                color: colors.accent,
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
                <Text style={{ fontSize: fs(14), color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                  Everything in your room is currently in good condition.
                </Text>
              </View>
            ) : (
              complaints.map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <View
                    key={item.id || item.complaint_id}
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
                        fontSize: fs(16),
                        fontWeight: '700',
                        color: colors.text,
                        flex: 1,
                        lineHeight: 23,
                      }}>
                        {item.title}
                      </Text>

                      <View style={{
                        backgroundColor: badge.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{
                          fontSize: fs(12),
                          fontWeight: '800',
                          color: badge.text,
                        }}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={{
                      fontSize: fs(13),
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
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 8 }}>
              Filing under: {user?.name || user?.email}
            </Text>

            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
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
                fontSize: fs(15),
                color: colors.text,
                marginBottom: 14,
              }}
              placeholder="e.g. Leaking faucet, broken lightbulb..."
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
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
                fontSize: fs(15),
                color: colors.text,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 14,
              }}
              placeholder="Provide any additional details or urgency..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={newDescription}
              onChangeText={setNewDescription}
            />

            {!!submitError && (
              <Text style={{ fontSize: fs(13), color: colors.danger, marginBottom: 12, fontWeight: '600' }}>
                {submitError}
              </Text>
            )}

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
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateComplaint}
                disabled={submitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={{ fontSize: fs(15), fontWeight: '800', color: colors.onPrimary }}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
