import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { cardStyle, fs, getResponsivePadding, isMobile } from '../../utils/responsive';

export default function TenantSetupRequiredScreen({ feature, onSetUp, applicationPendingReview = false }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding, paddingTop: isMobile ? 24 : 40 }}>
      <View style={{ ...cardStyle, alignSelf: 'center', width: '100%', maxWidth: 520, alignItems: 'center', padding: 24, backgroundColor: colors.card, borderColor: colors.cardBorder }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Ionicons name={applicationPendingReview ? 'time-outline' : 'document-text-outline'} size={26} color={colors.accent} />
        </View>
        <Text style={{ color: colors.text, fontSize: fs(19), fontWeight: '800', textAlign: 'center' }}>
          {applicationPendingReview ? 'Application under review' : 'Set up your application first'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fs(14), lineHeight: 21, textAlign: 'center', marginTop: 8 }}>
          {applicationPendingReview
            ? `You can access ${feature} after your application is approved.`
            : `Complete your room and move-in payment setup to access ${feature}.`}
        </Text>
        {!applicationPendingReview && (
          <TouchableOpacity
            onPress={onSetUp}
            accessibilityRole="button"
            accessibilityLabel="Set up application"
            activeOpacity={0.8}
            style={{ marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 11, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: fs(13), fontWeight: '800' }}>Set up application</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
