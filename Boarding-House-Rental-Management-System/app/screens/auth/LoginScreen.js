import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Animated,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  isMobile,
  isDesktop,
  getResponsivePadding,
  fs,
  cardShadow,
  safeAreaTop,
} from '../../utils/responsive';
import { useTheme } from '../../utils/ThemeContext';
import { loginWithEmail, registerUser, sendPasswordReset } from '../../services/authService';
import BrandMark from '../../../assets/nads-gracy-mark.svg';

// ─────────────────────────────────────────────────────────────
// Reusable UI pieces (defined OUTSIDE the screen so inputs don't
// lose focus while typing)
// ─────────────────────────────────────────────────────────────

function Field({ label, required, icon, colors, right, marginBottom = 16, ...inputProps }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom }}>
      <Text style={{ fontSize: fs(13), fontWeight: '700', color: colors.textSecondary, marginBottom: 7 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: focused ? colors.card : colors.searchBg,
          borderColor: focused ? colors.accent : colors.searchBorder,
          borderWidth: focused ? 2 : 1,
          borderRadius: 14,
          paddingHorizontal: focused ? 13 : 14,
          minHeight: 52,
        }}
      >
        <Ionicons
          name={icon}
          size={19}
          color={focused ? colors.accent : colors.textMuted}
          style={{ marginRight: 10 }}
        />
        <TextInput
          {...inputProps}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            paddingVertical: 13,
            fontSize: fs(15),
            color: colors.text,
            ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
          }}
        />
        {right}
      </View>
    </View>
  );
}

function EyeToggle({ visible, onPress, colors }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function Banner({ type, text, colors }) {
  const isError = type === 'error';
  const tone = isError ? colors.danger : colors.success;
  return (
    <View
      style={{
        backgroundColor: isError ? 'rgba(239, 68, 68, 0.10)' : 'rgba(16, 185, 129, 0.10)',
        borderColor: tone,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
      }}
    >
      <Ionicons name={isError ? 'alert-circle' : 'checkmark-circle'} size={20} color={tone} />
      <Text style={{ fontSize: fs(13), color: tone, flex: 1, fontWeight: '600', lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, icon, loading, onPress, colors }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={loading ? undefined : onPress}
      accessibilityState={{ disabled: loading }}
      style={{
        pointerEvents: loading ? 'none' : 'auto',
        backgroundColor: colors.primary,
        minHeight: 54,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        opacity: loading ? 0.85 : 1,
        ...cardShadow,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          <Text style={{ fontSize: fs(16), fontWeight: '800', color: '#ffffff' }}>{label}</Text>
          <Ionicons name={icon} size={19} color="#ffffff" />
        </>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────

export default function LoginScreen({ onLoginSuccess }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const padding = getResponsivePadding();
  const containerMaxWidth = isDesktop ? 480 : 560;

  // Active form mode: 'login' | 'register'
  const [formMode, setFormMode] = useState('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('tenant'); //'tenant' |'caretaker' |'owner'
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const formAnim = useRef(new Animated.Value(1)).current;

  const switchMode = useCallback((mode) => {
    if (mode === formMode) return;
    setErrorMessage('');
    setSuccessMessage('');
    formAnim.setValue(0);
    setFormMode(mode);
    Animated.timing(formAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [formAnim, formMode]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (formMode === 'register') {
        switchMode('login');
        return true;
      }

      return false;
    });

    return () => backSubscription.remove();
  }, [formMode, switchMode]);

  // ── Sign In handler (logic unchanged) ──────────────────────
  const handleSignIn = async (emailToUse, passToUse) => {
    const targetEmail = emailToUse !== undefined ? emailToUse : email;
    const targetPass = passToUse !== undefined ? passToUse : password;

    if (!targetEmail.trim() || !targetPass.trim()) {
      setErrorMessage('Please enter both email and password');
      setSuccessMessage('');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const user = await loginWithEmail(targetEmail, targetPass);
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Authentication failed');
    }
  };

  // ── Register handler (logic unchanged) ─────────────────────
  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in your name, email, and password');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const newUser = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        phone: regPhone.trim(),
      });

      setLoading(false);
      setSuccessMessage('Tenant account created successfully! Signing you in...');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(newUser);
      }, 700);
    } catch (err) {
      setLoading(false);
      setErrorMessage(err.message || 'Registration failed');
    }
  };

  const handleForgotPassword = async () => {
    setForgotError('');
    setForgotLoading(true);
    try {
      await sendPasswordReset(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setForgotError(err.message || 'Could not send the reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const isLogin = formMode === 'login';

  const tabs = [
    { key: 'login', label: 'Sign In', icon: 'log-in-outline' },
    { key: 'register', label: 'Tenant Sign Up', icon: 'person-add-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Theme toggle floating button */}
      <TouchableOpacity
        onPress={toggleTheme}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          top: isMobile ? safeAreaTop + 8 : 16,
          right: 16,
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.32)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={19} color={isDark ? '#fbbf24' : '#ffffff'} />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Brand hero ───────────────────────────────── */}
          <View
            style={{
              backgroundColor: 'rgb(82, 134, 158)',
              paddingTop: isMobile ? safeAreaTop + 30 : 60,
              paddingBottom: 44,
              alignItems: 'center',
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
              overflow: 'hidden',
            }}
          >
            {/* Decorative circles */}
            <View
              style={{
                position: 'absolute',
                top: -70,
                left: -50,
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: 'rgba(255,255,255,0.07)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -60,
                right: -40,
                width: 190,
                height: 190,
                borderRadius: 95,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />

            <BrandMark width={160} height={140} />
            <Text
              style={{
                marginTop: 2,
                color: '#ffffff',
                fontSize: fs(25),
                fontWeight: '900',
                letterSpacing: 1.1,
                textAlign: 'center',
              }}
            >
              NADS &amp; GRACY
            </Text>
            <Text
              style={{
                marginTop: 3,
                color: '#c8f1e2',
                fontSize: fs(10),
                fontWeight: '700',
                letterSpacing: 2,
                textAlign: 'center',
              }}
            >
              BOARDING HOUSE MANAGEMENT SYSTEM
            </Text>
          </View>

          {/* ── Form card (overlaps the hero) ────────────── */}
          <View style={{ paddingHorizontal: padding, marginTop: -48, alignItems: 'center' }}>
            <View
              style={{
                width: '100%',
                top: '5%',
                maxWidth: containerMaxWidth,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderWidth: 1,
                borderRadius: 24,
                padding: isMobile ? 20 : 28,
                ...cardShadow,
              }}
            >
              {/* Tabs */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.bg,
                  borderRadius: 14,
                  padding: 4,
                  marginBottom: 22,
                }}
              >
                {tabs.map((tab) => {
                  const active = formMode === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      activeOpacity={0.8}
                      onPress={() => switchMode(tab.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 11,
                        borderRadius: 11,
                        backgroundColor: active ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Ionicons name={tab.icon} size={16} color={active ? '#ffffff' : colors.textMuted} />
                      <Text
                        style={{
                          fontSize: fs(13),
                          fontWeight: '800',
                          color: active ? '#ffffff' : colors.textMuted,
                        }}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Heading */}
              <Text style={{ fontSize: fs(21), fontWeight: '900', color: colors.text, letterSpacing: -0.3 }}>
                {isLogin ? 'Welcome back' : 'Create your tenant account'}
              </Text>
              <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 4, marginBottom: 20, lineHeight: 19 }}>
                {isLogin ? 'Sign in to continue to your account.' : 'Fill in your details to start using the app.'}
              </Text>

              {/* Messages */}
              {errorMessage ? <Banner type="error" text={errorMessage} colors={colors} /> : null}
              {successMessage ? <Banner type="success" text={successMessage} colors={colors} /> : null}

              <Animated.View
                style={{
                  opacity: formAnim,
                  transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                }}
              >
                {/* ─── Sign In Form ─────────────────────────── */}
                {isLogin ? (
                  <View>
                    <Field
                      label="Email Address"
                      icon="mail-outline"
                      colors={colors}
                      placeholder="Enter your email..."
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />

                    <Field
                      label="Password"
                      icon="lock-closed-outline"
                      colors={colors}
                      marginBottom={8}
                      placeholder="Enter your password..."
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      right={
                        <EyeToggle visible={showPassword} onPress={() => setShowPassword(!showPassword)} colors={colors} />
                      }
                    />

                    <TouchableOpacity
                      onPress={() => {
                        setForgotEmail(email);
                        setForgotError('');
                        setForgotSent(false);
                        setShowForgotModal(true);
                      }}
                      style={{ alignSelf: 'flex-end', paddingVertical: 6, marginBottom: 14 }}
                    >
                      <Text style={{ fontSize: fs(13), color: colors.accent, fontWeight: '700' }}>Forgot password?</Text>
                    </TouchableOpacity>

                    <PrimaryButton
                      label="Sign In"
                      icon="arrow-forward"
                      loading={loading}
                      onPress={() => handleSignIn()}
                      colors={colors}
                    />
                  </View>
                ) : (
                  /* ─── Create Account / Registration Form ──── */
                  <View>
                    <Field
                      label="Full Name"
                      required
                      icon="person-outline"
                      colors={colors}
                      placeholder="e.g. Juan Dela Cruz"
                      value={regName}
                      onChangeText={setRegName}
                    />

                    <Field
                      label="Email Address"
                      required
                      icon="mail-outline"
                      colors={colors}
                      placeholder="e.g. juan@gmail.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={regEmail}
                      onChangeText={setRegEmail}
                    />

                    <Field
                      label="Contact Number"
                      icon="call-outline"
                      colors={colors}
                      placeholder="e.g. 09171234567"
                      keyboardType="phone-pad"
                      maxLength={11}
                      value={regPhone}
                      onChangeText={(text) => setRegPhone(text.replace(/[^0-9]/g, '').slice(0, 11))}
                    />

                    <Field
                      label="Create Password"
                      required
                      icon="lock-closed-outline"
                      colors={colors}
                      placeholder="At least 6 characters..."
                      secureTextEntry={!showRegPassword}
                      value={regPassword}
                      onChangeText={setRegPassword}
                      right={
                        <EyeToggle
                          visible={showRegPassword}
                          onPress={() => setShowRegPassword(!showRegPassword)}
                          colors={colors}
                        />
                      }
                    />

                    <Field
                      label="Confirm Password"
                      required
                      icon="shield-checkmark-outline"
                      colors={colors}
                      marginBottom={16}
                      placeholder="Re-enter your password..."
                      secureTextEntry={!showRegPassword}
                      value={regConfirmPassword}
                      onChangeText={setRegConfirmPassword}
                    />

                    {/* Notice: Owner/Caretaker are pre-provisioned */}
                    <View
                      style={{
                        backgroundColor: colors.accentBg,
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: colors.card,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="information-circle" size={22} color={colors.accent} />
                      </View>
                      <Text style={{ fontSize: fs(12), color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                        <Text style={{ fontWeight: '800', color: colors.text }}>For boarders only. </Text>
                        Owner and Caretaker accounts are set up by the administrator.
                      </Text>
                    </View>

                    <PrimaryButton
                      label="Register as Tenant"
                      icon="checkmark-done"
                      loading={loading}
                      onPress={handleRegister}
                      colors={colors}
                    />
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Footer helper */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => switchMode(isLogin ? 'register' : 'login')}
              style={{ marginTop: 22, padding: 6 }}
            >
              <Text style={{ fontSize: fs(13), color: colors.textMuted, textAlign: 'center' }}>
                {isLogin ? 'New boarder? ' : 'Already have an account? '}
                <Text style={{ color: colors.accent, fontWeight: '800' }}>
                  {isLogin ? 'Create a tenant account' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ────────────────────── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: colors.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 24,
              ...cardShadow,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: colors.accentBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="key-outline" size={24} color={colors.accent} />
              </View>
              <TouchableOpacity onPress={() => setShowForgotModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: fs(19), fontWeight: '800', color: colors.text, marginBottom: 8 }}>
              Password Recovery
            </Text>

            <Text style={{ fontSize: fs(14), color: colors.textSecondary, marginBottom: 16, lineHeight: 21 }}>
              Enter your account email and we’ll send a secure password reset link if an account is registered with that address.
            </Text>

            {!forgotSent && (
              <Field
                label="Email Address"
                required
                icon="mail-outline"
                colors={colors}
                placeholder="Enter your account email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={forgotEmail}
                onChangeText={(value) => { setForgotEmail(value); setForgotError(''); }}
              />
            )}

            {forgotError ? <Banner type="error" text={forgotError} colors={colors} /> : null}
            {forgotSent ? <Banner type="success" text="If an account uses that email, a reset link is on the way. Check your inbox and spam folder." colors={colors} /> : null}

            {!forgotSent && (
              <PrimaryButton
                label="Send Reset Link"
                icon="mail-outline"
                loading={forgotLoading}
                onPress={handleForgotPassword}
                colors={colors}
              />
            )}

            <TouchableOpacity
              onPress={() => setShowForgotModal(false)}
              activeOpacity={0.85}
              style={{
                marginTop: forgotSent ? 0 : 12,
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: fs(15) }}>{forgotSent ? 'Back to Sign In' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
