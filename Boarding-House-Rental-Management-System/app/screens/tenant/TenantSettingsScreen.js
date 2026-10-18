import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTenantSettingsProfile } from '../../services/dataService';
import { updateTenantAccount } from '../../services/authService';
import { useTheme } from '../../utils/ThemeContext';
import { cardShadow, getResponsivePadding, isDesktop } from '../../utils/responsive';

function SettingsField({ label, value, onChangeText, colors, ...inputProps }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={{
          color: colors.text,
          backgroundColor: colors.bg,
          borderColor: colors.cardBorder,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 13,
          paddingVertical: 12,
          fontSize: 15,
        }}
        {...inputProps}
      />
    </View>
  );
}

export default function TenantSettingsScreen({ user, onBack, onUserUpdated }) {
  const { colors } = useTheme();
  const padding = getResponsivePadding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const profile = await getTenantSettingsProfile(user?.tenant_id);
        if (!active) return;
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setPhone(profile.phone);
        setEmergencyContact(profile.emergencyContact);
      } catch (loadError) {
        if (active) setError(loadError?.message || 'Could not load your profile. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, [user?.tenant_id]);

  const saveChanges = async () => {
    setError('');
    setSuccess('');
    if (newPassword && newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await updateTenantAccount({
        tenantId: user?.tenant_id,
        firstName,
        lastName,
        phone,
        emergencyContact,
        currentPassword,
        newPassword,
      });
      onUserUpdated?.(updatedUser);
      setFirstName(firstName.trim());
      setLastName(lastName.trim());
      setPhone(phone.trim());
      setEmergencyContact(emergencyContact.trim());
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Your profile and account changes have been saved.');
    } catch (saveError) {
      setError(saveError?.message || 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'T';
  const cardStyle = {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    ...cardShadow,
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} style={{ flex: 1 }}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding, paddingTop: 20, paddingBottom: 32, alignItems: isDesktop ? 'center' : 'stretch' }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: '100%', maxWidth: 760 }}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 }}
        >
          <Ionicons name="arrow-back" size={18} color={colors.accent} />
          <Text style={{ color: colors.accent, marginLeft: 7, fontSize: 14, fontWeight: '700' }}>Back to home</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
            <Text style={{ color: colors.accent, fontSize: 19, fontWeight: '800' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800' }}>Account settings</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 3 }}>Manage your tenant profile and sign-in details.</Text>
          </View>
        </View>

        {error ? (
          <View style={{ backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <Text style={{ color: colors.dangerText, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={{ backgroundColor: colors.successBg, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <Text style={{ color: colors.successText, fontSize: 13 }}>{success}</Text>
          </View>
        ) : null}

        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <Ionicons name="person-outline" size={19} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginLeft: 9 }}>Personal information</Text>
          </View>
          {loading ? <ActivityIndicator color={colors.accent} style={{ paddingVertical: 20 }} /> : (
            <>
              <SettingsField label="First name" value={firstName} onChangeText={setFirstName} colors={colors} autoCapitalize="words" returnKeyType="next" />
              <SettingsField label="Last name" value={lastName} onChangeText={setLastName} colors={colors} autoCapitalize="words" returnKeyType="next" />
              <SettingsField label="Phone number" value={phone} onChangeText={setPhone} colors={colors} keyboardType="phone-pad" />
              <SettingsField label="Emergency contact" value={emergencyContact} onChangeText={setEmergencyContact} colors={colors} keyboardType="phone-pad" />
            </>
          )}
        </View>

        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="lock-closed-outline" size={19} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginLeft: 9 }}>Change password</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 16 }}>
            Leave these fields blank if you do not want to change your password.
          </Text>
          <SettingsField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} colors={colors} secureTextEntry autoCapitalize="none" textContentType="password" />
          <SettingsField label="New password" value={newPassword} onChangeText={setNewPassword} colors={colors} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
          <SettingsField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} colors={colors} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
        </View>

        <TouchableOpacity
          onPress={saveChanges}
          disabled={saving || loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Save all changes"
          style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: saving || loading ? colors.textMuted : colors.successText, marginTop: 2 }}
        >
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="save-outline" size={19} color={colors.onPrimary} />}
          <Text style={{ color: colors.onPrimary, fontSize: 15, fontWeight: '800', marginLeft: 9 }}>{saving ? 'Saving…' : 'Save all changes'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
