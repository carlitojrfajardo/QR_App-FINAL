import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import BrandBackground from '@/components/BrandBackground';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
      });

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrandBackground style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            {/* Minimal cardless auth layout */}
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>REGISTER</Text>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>
                Register to start recording attendance
              </Text>
            </View>

            <View style={styles.divider} />

            {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successTitle}>Check your email!</Text>
                  <Text style={styles.successText}>
                    We sent a confirmation link to {email}. Click the link to
                    verify your account, then come back and sign in.
                  </Text>
                  <Link href="/login" style={styles.link}>
                    Back to Sign In
                  </Link>
                </View>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Juan Dela Cruz"
                    placeholderTextColor={COLORS.mutedOnBackground}
                    editable={!loading}
                  />

                  <Text style={styles.roleHint}>
                    New accounts start as students. Ask an administrator to
                    promote you to teacher.
                  </Text>

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@school.edu"
                    placeholderTextColor={COLORS.mutedOnBackground}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />

                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.mutedOnBackground}
                    secureTextEntry
                    editable={!loading}
                  />

                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter your password"
                    placeholderTextColor={COLORS.mutedOnBackground}
                    secureTextEntry
                    editable={!loading}
                  />

                  {error && <Text style={styles.error}>{error}</Text>}

                  {loading ? (
                    <ActivityIndicator
                      size="large"
                      color={COLORS.textOnBackground}
                      style={styles.loader}
                    />
                  ) : (
                    <View style={styles.buttonWrap}>
                      <AppButton
                        theme="primary"
                        title="Sign Up"
                        icon="person-add-outline"
                        onPress={handleRegister}
                      />
                    </View>
                  )}
                </View>
              )}

            {!success && (
              <View style={styles.footer}>
                <Link href="/login" style={styles.link}>
                  Already have an account? Sign In
                </Link>
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'stretch',
  },
  headerContainer: {
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 28,
  },
  titleBlock: {
    gap: 6,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.mutedOnBackground,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.track,
    marginVertical: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: COLORS.textOnBackground,
    marginBottom: 4,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.mutedOnBackground,
    textAlign: 'left',
  },
  form: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    minHeight: 52,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textOnBackground,
  },
  roleHint: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.mutedOnBackground,
    marginTop: 16,
  },
  error: {
    fontSize: 14,
    color: COLORS.danger,
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'left',
  },
  loader: {
    marginVertical: 16,
  },
  buttonWrap: {
    marginTop: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.track,
    marginTop: 28,
    paddingTop: 20,
  },
  link: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textOnBackground,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: COLORS.mutedOnBackground,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
});
