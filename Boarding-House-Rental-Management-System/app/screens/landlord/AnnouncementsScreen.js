import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import {
  isMobile,
  isTablet,
  isDesktop,
  getResponsivePadding,
  fs,
  spacing,
  cardStyle,
  cardShadow,
  safeAreaTop,
  accentShadow,
} from '../utils/responsive';
import { getAnnouncements, addAnnouncement } from '../services/dataService';

export default function AnnouncementsScreen() {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 1400 : '100%';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New announcement modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Payment');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim()) {
      setSubmitError('Please enter a title.');
      return;
    }
    if (!newDescription.trim()) {
      setSubmitError('Please enter a description.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');
      const created = await addAnnouncement({
        category: newCategory,
        title: newTitle.trim(),
        description: newDescription.trim(),
      });
      setAnnouncements((prev) => [created, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setModalVisible(false);
    } catch (err) {
      setSubmitError('Failed to publish announcement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBorderColor = (category) => {
    switch (category) {
      case 'Payment':
        return colors.success;
      case 'Maintenance':
        return colors.info;
      case 'House Rules':
        return colors.warning;
      default:
        return colors.accent;
    }
  };

  const getCategoryColors = (category) => {
    switch (category) {
      case 'Payment':
        return { bg: colors.successBg, text: colors.successText };
      case 'Maintenance':
        return { bg: colors.infoBg, text: colors.infoText };
      case 'House Rules':
        return { bg: colors.warningBg, text: colors.warningText };
      default:
        return { bg: colors.accentBg, text: colors.accent };
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Payment':
        return 'card';
      case 'Maintenance':
        return 'construct';
      case 'House Rules':
        return 'document-text';
      default:
        return 'notifications';
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
      {/* Header */}
      <View
        style={{
          paddingHorizontal: padding,
          paddingTop: isMobile ? safeAreaTop + 16 : isDesktop ? 40 : 60,
          paddingBottom: spacing.lg,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text
                style={{
                  fontSize: fs(13),
                  color: colors.textMuted,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                Notice Board
              </Text>
              <Text
                style={{
                  fontSize: fs(32),
                  color: colors.text,
                  fontWeight: '700',
                  letterSpacing: -0.5,
                }}
              >
                Announcements
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.accentBg,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: fs(12), fontWeight: '700', color: colors.accent }}>
                {announcements.length} active
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Announcements List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: padding,
          paddingBottom: 80,
          gap: spacing.lg,
          alignItems: isDesktop ? 'center' : 'stretch',
        }}
      >
        <View style={{ maxWidth: containerMaxWidth, width: '100%', gap: spacing.lg }}>
          {announcements.length === 0 ? (
            <View style={{ ...cardStyle, backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 32, alignItems: 'center' }}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
              <Text style={{ fontSize: fs(16), fontWeight: '700', color: colors.text, marginTop: 12 }}>
                No announcements
              </Text>
              <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 4 }}>
                Tap the + button below to create one.
              </Text>
            </View>
          ) : (
            announcements.map((announcement) => {
              const catColors = getCategoryColors(announcement.category);
              return (
                <TouchableOpacity
                  key={announcement.id || announcement.announcement_id}
                  accessibilityRole="button"
                  accessibilityLabel={`Read announcement: ${announcement.title}`}
                  activeOpacity={0.85}
                  onPress={() => setSelectedAnnouncement(announcement)}
                  style={{
                    ...cardStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    borderLeftWidth: 3,
                    borderLeftColor: getCategoryBorderColor(announcement.category),
                    padding: isDesktop ? 24 : 18,
                    borderRadius: 20,
                    overflow: 'hidden',
                  }}
                >
                  {/* Category Badge & Date */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: catColors.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={getCategoryIcon(announcement.category)}
                        size={13}
                        color={catColors.text}
                      />
                      <Text
                        style={{
                          fontSize: fs(11),
                          fontWeight: '700',
                          color: catColors.text,
                        }}
                      >
                        {announcement.category}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={{ fontSize: fs(12), fontWeight: '500', color: colors.textMuted }}>
                        {announcement.date || announcement.created_at}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text
                    style={{
                      fontSize: fs(18),
                      fontWeight: '700',
                      color: colors.text,
                      marginBottom: 8,
                      lineHeight: fs(24),
                    }}
                  >
                    {announcement.title}
                  </Text>

                  {/* Description */}
                  <Text
                    style={{
                      fontSize: fs(14),
                      fontWeight: '400',
                      color: colors.textSecondary,
                      lineHeight: 22,
                    }}
                  >
                    {announcement.description}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      <AnnouncementDetailsModal announcement={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          overflow: 'hidden',
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          ...accentShadow,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Create Announcement Modal */}
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
                New Announcement
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Category Selector */}
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
              Category
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {['Payment', 'Maintenance', 'House Rules'].map((cat) => {
                const isSelected = newCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isSelected ? colors.accent : colors.filterBg,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.accent : colors.cardBorder,
                    }}
                  >
                    <Text style={{ color: isSelected ? '#ffffff' : colors.textSecondary, fontSize: fs(12), fontWeight: '700' }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
              Title *
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
              placeholder="Announcement title..."
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={{ fontSize: fs(14), fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
              Description *
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
              placeholder="Write the full announcement details here..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={newDescription}
              onChangeText={setNewDescription}
            />

            {!!submitError && (
              <Text style={{ fontSize: fs(13), color: colors.danger, marginBottom: 10, fontWeight: '600' }}>
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
                onPress={handleCreateAnnouncement}
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
                  <Text style={{ fontSize: fs(15), fontWeight: '800', color: colors.onPrimary }}>Publish</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
