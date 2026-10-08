import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { safeAreaTop } from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { loginWithEmail, registerUser, sendPasswordReset } from '../../services/authService';
import Logo from '../../components/Logo';
import AuthFormField from '../../components/auth/AuthFormField';
import AuthNotice from '../../components/auth/AuthNotice';
import AuthPrimaryButton from '../../components/auth/AuthPrimaryButton';
import AuthModeSelector from '../../components/auth/AuthModeSelector';

const REMEMBERED_ACCOUNT_KEY = '@nads-gracy/remembered-login';

/* ─── Brand palette for the hero section & form ──────────────────────── */

function getLoginPalette(isDark) {
  if (isDark) {
    return {
      // Page
      pageBg: '#0A1220',
      // Hero / top section
      heroStart: '#0B1A2E',
      heroEnd: '#122A3E',
      heroArc: 'rgba(255,255,255,0.04)',
      heroText: '#F8FAFC',
      heroSubtext: '#94B8D0',
      iconBubble: 'rgba(255,255,255,0.10)',
      iconColor: '#CBD5E1',
      heroStart: '#0D1B2A',
      heroEnd: '#152838',
      heroArc: 'rgba(56,189,248,0.08)',
      heroText: '#F1F5F9',
      heroSubtext: '#7EADC6',
      iconBubble: 'rgba(255,255,255,0.14)',
      iconColor: '#E2E8F0',
      // Form / bottom card
      surface: '#111B2B',
      input: '#0D1726',
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      muted: '#94A3B8',
      border: '#334155',
      segmentTrack: '#0D1726',
      surface: '#111927',
      input: '#0C1422',
      text: '#F1F5F9',
      textSecondary: '#A8BFCF',
      muted: '#64809A',
      border: '#1E3044',
      segmentTrack: '#0C1422',
      accent: '#38BDF8',
      accentSoft: '#102B3B',
      accentSoft: '#0E2A3E',
      danger: '#F87171',
      dangerBg: '#351D27',
      dangerBg: '#2D151E',
      success: '#4ADE80',
      successBg: '#132F2B',
      successBg: '#0F2A22',
    };
  }

  return {
    pageBg: '#E9EDF0',
    heroStart: '#1B3D5C',
    heroEnd: '#2A5A78',
    heroArc: 'rgba(255,255,255,0.06)',
    heroText: '#FFFFFF',
    heroSubtext: 'rgba(255,255,255,0.72)',
    iconBubble: 'rgba(255,255,255,0.13)',
    iconColor: '#E2E8F0',
    surface: '#FFFFFF',
    input: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    muted: '#94A3B8',
    border: '#E2E8F0',
    segmentTrack: '#F8FAFC',
    accent: '#0EA5E9',
    accentSoft: '#E0F2FE',
    danger: '#DC2626',
    dangerBg: '#FEF2F2',
    success: '#15803D',
    successBg: '#F0FDF4',
  };
}

/* ─── Tiny helper components ──────────────────────────────────────────── */

function Message({ message, palette }) {
  if (!message) return null;
  return <AuthNotice type={message.type} palette={palette}>{message.text}</AuthNotice>;
}

function PasswordVisibilityButton({ visible, onPress, palette }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      hitSlop={10}
      onPress={onPress}
      style={styles.eyeButton}
    >
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.muted} />
    </Pressable>
  );
}

function RememberAccount({ value, onChange, palette }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.rememberRow}
    >
      <View style={[styles.checkbox, { borderColor: value ? palette.accent : palette.border, backgroundColor: value ? palette.accent : 'transparent' }]}>
        {value ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
      </View>
      <Text style={[styles.rememberText, { color: palette.textSecondary }]}>Remember my account</Text>
    </Pressable>
  );
}

function RecoveryModal({
  visible,
  onClose,
  onSend,
  email,
  onEmailChange,
  loading,
  sent,
  message,
  palette,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close recovery dialog" />
        <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.modalTopRow}>
            <View style={[styles.modalIcon, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="key-outline" size={22} color={palette.accent} />
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={palette.muted} />
            </Pressable>
          </View>

          <Text style={[styles.modalTitle, { color: palette.text }]}>Account help</Text>
          <Text style={[styles.modalDescription, { color: palette.textSecondary }]}>
              Enter the email address for your account and we'll send a secure reset link if it is registered.
          </Text>

          {!sent ? (
            <>
              <AuthFormField
                label="Account email"
                icon="mail-outline"
                palette={palette}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={onEmailChange}
                returnKeyType="send"
                onSubmitEditing={onSend}
              />
              <Message message={message} palette={palette} />
              <AuthPrimaryButton label="Send reset link" loading={loading} onPress={onSend} palette={palette} />
            </>
          ) : (
            <AuthNotice type="success" palette={palette}>
              If that email belongs to an account, a password reset link is on its way.
            </AuthNotice>
          )}

          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <Text style={[styles.modalCloseText, { color: palette.textSecondary }]}>{sent ? 'Back to sign in' : 'Cancel'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Decorative arcs for the hero ────────────────────────────────────── */

function HeroArcs({ palette, screenWidth }) {
  const arcSize = Math.max(screenWidth * 0.9, 320);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Large arc – upper-right */}
      <View
        style={[
          styles.arc,
          {
            width: arcSize,
            height: arcSize,
            borderRadius: arcSize / 2,
            borderColor: palette.heroArc,
            top: -arcSize * 0.35,
            right: -arcSize * 0.3,
          },
        ]}
      />
      {/* Medium arc – lower-left */}
      <View
        style={[
          styles.arc,
          {
            width: arcSize * 0.7,
            height: arcSize * 0.7,
            borderRadius: (arcSize * 0.7) / 2,
            borderColor: palette.heroArc,
            bottom: -arcSize * 0.1,
            left: -arcSize * 0.25,
          },
        ]}
      />
      {/* Small accent arc – center-right */}
      <View
        style={[
          styles.arc,
          {
            width: arcSize * 0.45,
            height: arcSize * 0.45,
            borderRadius: (arcSize * 0.45) / 2,
            borderColor: palette.heroArc,
            top: '40%',
            right: -arcSize * 0.15,
          },
        ]}
      />
    </View>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

export default function LoginScreen({ onLoginSuccess }) {
  const { isDark, toggleTheme } = useTheme();
  const palette = getLoginPalette(isDark);
  const { width, height: screenHeight } = useWindowDimensions();
  const compact = width < 380;
  const fontScale = Math.min(1.12, Math.max(0.94, width / 390));
  const horizontalPadding = width >= 768 ? 32 : compact ? 18 : 22;

  const [formMode, setFormMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState(null);

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  /* ── Remembered account ───────────────────────────── */
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(REMEMBERED_ACCOUNT_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const account = JSON.parse(stored);
        if (account.type === 'admin') {
          setRememberAccount(false);
          AsyncStorage.removeItem(REMEMBERED_ACCOUNT_KEY).catch(() => {});
          return;
        }
        if (typeof account.email === 'string') setEmail(account.email);
        setRememberAccount(true);
      })
      .catch(() => {});

    return () => { active = false; };
  }, []);

  const rememberCurrentAccount = async (nextEmail) => {
    try {
      if (rememberAccount) {
        await AsyncStorage.setItem(REMEMBERED_ACCOUNT_KEY, JSON.stringify({ email: nextEmail }));
      } else {
        await AsyncStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
      }
    } catch (error) {
      // A storage error should not prevent a valid sign-in.
      console.warn('Could not save the remembered account preference:', error?.message);
    }
  };

  const changeRememberAccount = (value) => {
    setRememberAccount(value);
    if (!value) {
      AsyncStorage.removeItem(REMEMBERED_ACCOUNT_KEY).catch(() => {});
    }
  };

  /* ── Auth handlers ────────────────────────────────── */
  const handleSignIn = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setMessage({ type: 'error', text: 'Enter your email and password to continue.' });
      return;
    }

    Keyboard.dismiss();
    setMessage(null);
    setLoading(true);
    try {
      const user = await loginWithEmail(cleanEmail, password);
      await rememberCurrentAccount(cleanEmail);
      setLoading(false);
      onLoginSuccess?.(user);
    } catch (error) {
      setLoading(false);
      setMessage({ type: 'error', text: error?.message || 'We could not sign you in. Please try again.' });
    }
  };

  const handlePhoneChange = (text) => {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(digitsOnly);
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Complete your name, email, and password fields.' });
      return;
    }
    const cleanPhone = phone.trim();
    if (cleanPhone && cleanPhone.length !== 11) {
      setMessage({ type: 'error', text: 'Mobile number must be 11 digits (e.g. 09123456789).' });
      return;
    }
    if (password.toLowerCase() !== confirmPassword.toLowerCase()) {
      setMessage({ type: 'error', text: 'Your passwords do not match.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Use a password with at least 6 characters.' });
      return;
    }

    Keyboard.dismiss();
    setMessage(null);
    setLoading(true);
    try {
      const user = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: cleanPhone,
      });
      await rememberCurrentAccount(email.trim());
      setLoading(false);
      onLoginSuccess?.(user);
    } catch (error) {
      setLoading(false);
      setMessage({ type: 'error', text: error?.message || 'We could not create your account. Please try again.' });
    }
  };

  const openRecovery = () => {
    setRecoveryEmail(email.trim());
    setRecoveryMessage(null);
    setRecoverySent(false);
    setRecoveryVisible(true);
  };

  const handleRecovery = async () => {
    if (!recoveryEmail.trim()) {
      setRecoveryMessage({ type: 'error', text: 'Enter the email address for your account.' });
      return;
    }
    setRecoveryLoading(true);
    setRecoveryMessage(null);
    try {
      await sendPasswordReset(recoveryEmail);
      setRecoverySent(true);
    } catch (error) {
      setRecoveryMessage({ type: 'error', text: error?.message || 'We could not send the reset link.' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const isRegistering = formMode === 'register';
  const heroMinHeight = isRegistering ? 200 : 280;

  return (
    <View style={[styles.page, { backgroundColor: palette.pageBg }]}>
      {/* ─── HERO (top teal section) ─────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: palette.heroStart, minHeight: heroMinHeight }]}>
        {/* Gradient overlay for depth */}
        <View
          style={[
            styles.heroGradientOverlay,
            { backgroundColor: palette.heroEnd, opacity: 0.5 },
          ]}
        />

        {/* Decorative arcs */}
        <HeroArcs palette={palette} screenWidth={width} />

        {/* Brightness toggle */}
        <View style={[styles.topIconRow, { top: Math.max(safeAreaTop, 12) + 8, right: horizontalPadding }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            onPress={toggleTheme}
            activeOpacity={0.75}
            style={[styles.iconBubble, { backgroundColor: palette.iconBubble }]}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={palette.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Centered brand content */}
        <View style={styles.heroBrand}>
          <View style={styles.heroLogoWrapper}>
            <Logo variant="mark" width={compact ? 100 : 130} accessibilityLabel="Nads and Gracy house logo" />
          </View>
          <Text style={[styles.heroTitle, { color: palette.heroText, fontSize: Math.round((compact ? 22 : 26) * fontScale) }]}>
            NADS & GRACY
          </Text>
          <Text style={[styles.heroSubtitle, { color: palette.heroSubtext, fontSize: Math.round(12 * fontScale) }]}>
            BOARDING HOUSE MANAGEMENT SYSTEM
          </Text>
        </View>
      </View>

      {/* ─── FORM CARD (overlaps hero with rounded top) ──────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.formArea}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formCard, { backgroundColor: palette.surface, maxWidth: 480 }]}>
            <AuthModeSelector
              value={formMode}
              onChange={(mode) => { setFormMode(mode); setMessage(null); }}
              palette={palette}
            />

            <Text style={[styles.formTitle, { color: palette.text, fontSize: Math.round(21 * fontScale) }]}>
              {isRegistering ? 'Create your boarder account' : 'Sign in to your account'}
            </Text>
            <Text style={[styles.formSubtitle, { color: palette.textSecondary }]}>
              {isRegistering
                ? 'Set up your account to stay on top of your home.'
                : 'View your room, payments, and requests.'}
            </Text>

            <Message message={message} palette={palette} />

            {isRegistering ? (
              <>
                <AuthFormField
                  label="Full name"
                  icon="person-outline"
                  palette={palette}
                  placeholder="Your name"
                  autoCapitalize="words"
                  autoComplete="name"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                />
                <AuthFormField
                  label="Email address"
                  icon="mail-outline"
                  palette={palette}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="next"
                />
                <AuthFormField
                  label="Mobile number (optional)"
                  icon="call-outline"
                  palette={palette}
                  placeholder="09XXXXXXXXX (11 digits)"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={11}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  returnKeyType="next"
                />
                <AuthFormField
                  label="Password"
                  icon="lock-closed-outline"
                  palette={palette}
                  placeholder="At least 6 characters"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  right={<PasswordVisibilityButton visible={showPassword} onPress={() => setShowPassword((value) => !value)} palette={palette} />}
                />
                <AuthFormField
                  inputRef={confirmPasswordRef}
                  label="Confirm password"
                  icon="shield-checkmark-outline"
                  palette={palette}
                  placeholder="Enter your password again"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                />

                <AuthNotice type="info" palette={palette} style={styles.registerNotice}>
                  Tenant sign-up is for residents. If you need an invitation, ask your property manager.
                </AuthNotice>

                <AuthPrimaryButton
                  label="Create account"
                  loading={loading}
                  onPress={handleRegister}
                  palette={palette}
                />
              </>
            ) : (
              <>
                <AuthFormField
                  inputRef={passwordRef}
                  label="Email address"
                  icon="mail-outline"
                  palette={palette}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />

                <AuthFormField
                  label="Password"
                  icon="lock-closed-outline"
                  palette={palette}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleSignIn}
                  containerStyle={styles.passwordField}
                  right={<PasswordVisibilityButton visible={showPassword} onPress={() => setShowPassword((value) => !value)} palette={palette} />}
                />

                <View style={styles.utilityRow}>
                  <RememberAccount value={rememberAccount} onChange={changeRememberAccount} palette={palette} />
                  <Pressable onPress={openRecovery} hitSlop={6} style={styles.forgotButton}>
                    <Text style={[styles.forgotText, { color: palette.accent }]}>Forgot password?</Text>
                  </Pressable>
                </View>

                <AuthPrimaryButton label="Sign in" loading={loading} onPress={handleSignIn} palette={palette} />
              </>
            )}

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: palette.textSecondary }]}>
                {isRegistering ? 'Already have an account? Use Sign In above.' : 'Tenant access for Nads & Gracy residents.'}
              </Text>
            </View>

            <Text style={[styles.securityCaption, { color: palette.muted }]}>Secure access for your boarding house</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <RecoveryModal
        visible={recoveryVisible}
        onClose={() => setRecoveryVisible(false)}
        onSend={handleRecovery}
        email={recoveryEmail}
        onEmailChange={(value) => { setRecoveryEmail(value); setRecoveryMessage(null); }}
        loading={recoveryLoading}
        sent={recoverySent}
        message={recoveryMessage}
        palette={palette}
      />
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  /* ── Hero (top teal area) ─────────────────────────── */
  hero: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 32,
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  arc: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  topIconRow: {
    position: 'absolute',
    zIndex: 5,
    flexDirection: 'column',
    gap: 10,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBrand: {
    alignItems: 'center',
    paddingTop: 20,
  },
  heroLogoWrapper: {
    marginBottom: 16,
  },
  heroTitle: {
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 6,
  },

  /* ── Form area (white card section) ───────────────── */
  formArea: {
    flex: 1,
    marginTop: -24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  formCard: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 32,
    padding: 24,
    minHeight: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    ...Platform.select({ web: { boxShadow: '0 -6px 28px rgba(15, 23, 42, 0.12)' } }),
  },

  /* ── Form elements ─────────────────────────────────── */
  formTitle: {
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 20,
  },
  passwordField: {
    marginBottom: 7,
  },
  utilityRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    gap: 8,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderWidth: 1.5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  forgotButton: {
    paddingVertical: 8,
    paddingLeft: 4,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  registerNotice: {
    marginBottom: 18,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  securityCaption: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },
  eyeButton: {
    padding: 3,
  },

  /* ── Recovery modal ────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 7,
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  modalCloseButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
