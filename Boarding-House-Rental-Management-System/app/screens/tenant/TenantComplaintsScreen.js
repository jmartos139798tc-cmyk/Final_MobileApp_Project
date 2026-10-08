import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isMobile, isDesktop, getResponsivePadding, fs, spacing, cardStyle, cardShadow } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { getTenantComplaints, submitComplaint } from '../../services/dataService';

export default function TenantComplaintsScreen({ user }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1180 : '100%';

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
    if (!newDescription.trim()) {
      setSubmitError('Please enter a message describing your complaint.');
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
        <TouchableOpacity onPress={loadComplaints} style={{ marginTop: 18, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 999, overflow: 'hidden' }}>
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
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
          <View style={{ padding, paddingTop: isMobile ? 16 : isDesktop ? 28 : 24, paddingBottom: 20 }}>
            <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginBottom: 5 }}>TENANT PORTAL</Text>
            <Text style={{ fontSize: fs(28), color: colors.text, fontWeight: '900', letterSpacing: -0.5 }}>My complaints</Text>
            <Text style={{ fontSize: fs(14), color: colors.textSecondary, lineHeight: 21, marginTop: 6, marginBottom: spacing.lg }}>
              Report a maintenance issue and follow its progress here.
            </Text>

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
                  If something needs attention, use the + button and the caretaker can follow up.
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

                    {!!item.description && <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginTop: 10, lineHeight: 21 }}>{item.description}</Text>}

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

      <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add complaint"
          activeOpacity={0.8}
          onPress={() => {
            setSubmitError('');
            setModalVisible(true);
          }}
          style={{ position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 5 }}
        >
          <Ionicons name="add" size={30} color={colors.onPrimary} />
      </TouchableOpacity>

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
              Message *
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
              placeholder="Describe your complaint and any details the caretaker should know..."
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
                  overflow: 'hidden',
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
                onPress={submitting ? undefined : handleCreateComplaint}
                accessibilityState={{ disabled: submitting }}
                style={{
                  pointerEvents: submitting ? 'none' : 'auto',
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  overflow: 'hidden',
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
