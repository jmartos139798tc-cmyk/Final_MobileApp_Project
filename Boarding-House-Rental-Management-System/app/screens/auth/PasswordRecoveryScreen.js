import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { completePasswordRecovery } from '../../services/authService';
import { useTheme } from '../../utils/ThemeContext';

export default function PasswordRecoveryScreen({ onComplete }) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const user = await completePasswordRecovery(password);
      onComplete?.(user);
    } catch (submitError) {
      setError(submitError?.message || 'Could not update your password. Open the reset link again and retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} style={{ flex: 1 }}>
    <View style={{ flex: 1 }}>
    <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} accessible={false} />
    <View pointerEvents="box-none" style={[styles.page, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.title, { color: colors.text }]}>Choose a new password</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>Enter and confirm your new password to finish account recovery.</Text>
        <TextInput
          accessibilityLabel="New password"
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
        />
        <TextInput
          accessibilityLabel="Confirm new password"
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onSubmitEditing={submit}
          placeholder="Confirm new password"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
        />
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Pressable disabled={saving} onPress={submit} style={[styles.button, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{saving ? 'Saving…' : 'Update password'}</Text>
        </Pressable>
      </View>
    </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 20, padding: 24 },
  title: { fontSize: 23, fontWeight: '800', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginBottom: 12 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { fontSize: 15, fontWeight: '700' },
});
