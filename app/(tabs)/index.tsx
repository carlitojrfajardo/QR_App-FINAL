
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BrandBackground from '@/components/BrandBackground';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        setRole(null);
        return;
      }
      getProfile(user.id).then((profile) => {
        if (active) setRole(profile?.role ?? 'student');
      });
      return () => {
        active = false;
      };
    }, [user])
  );

  const isAdmin = role === 'admin';
  const steps = isAdmin
    ? [
        { n: '1', t: 'Check the Dashboard for live campus stats' },
        { n: '2', t: 'Promote teachers in User Management' },
        { n: '3', t: 'Manage events and QR codes in the Teacher tab' },
      ]
    : [
        { n: '1', t: 'Open Scan and point at the event QR' },
        { n: '2', t: 'Wait for the success confirmation' },
        { n: '3', t: 'Check History to verify your record' },
      ];

  return (
    <SafeAreaView style={styles.container}>
      <BrandBackground>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.pageHead}>
            <Text style={styles.eyebrow}>HOME</Text>
            <Text style={styles.pageTitle}>QR Attendance</Text>
            <Text style={styles.pageSub}>
              {isAdmin
                ? 'Monitor attendance and manage users across campus.'
                : 'Scan event QR codes to record your attendance securely in the cloud.'}
            </Text>
          </View>

          {/* Primary action: admins get the Dashboard instead of the scanner. */}
          {role !== null &&
            (isAdmin ? (
              <Pressable
                style={styles.cta}
                onPress={() => router.push('/dashboard')}
              >
                <View style={styles.ctaLeft}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.ctaText}>Open Dashboard</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                style={styles.cta}
                onPress={() => router.push('/scan')}
              >
                <View style={styles.ctaLeft}>
                  <Ionicons
                    name="qr-code-outline"
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.ctaText}>Scan QR Code</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </Pressable>
            ))}

          {/* Quick Actions */}
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>

          <View style={styles.quickRow}>
            <Pressable
              style={styles.quickCard}
              onPress={() => router.push('/history')}
            >
              <View style={styles.quickIcon}>
                <Ionicons
                  name="time-outline"
                  size={22}
                  color={COLORS.textPrimary}
                />
              </View>
              <Text style={styles.quickTitle}>History</Text>
              <Text style={styles.quickSub}>Past scans</Text>
            </Pressable>

            <Pressable
              style={styles.quickCard}
              onPress={() => router.push('/profile')}
            >
              <View style={styles.quickIcon}>
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={COLORS.textPrimary}
                />
              </View>
              <Text style={styles.quickTitle}>Profile</Text>
              <Text style={styles.quickSub}>Account</Text>
            </Pressable>
          </View>

          {/* How It Works */}
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>

          <View style={styles.steps}>
            {steps.map((s, i) => (
              <View
                key={s.n}
                style={[
                  styles.stepRow,
                  i < steps.length - 1 && styles.stepDivider,
                ]}
              >
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.n}</Text>
                </View>
                <Text style={styles.stepText}>{s.t}</Text>
              </View>
            ))}
          </View>

            {/* Bottom spacing */}
            <View style={styles.bottomSpace} />
          </ScrollView>
      </BrandBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
    alignItems: 'stretch',
  },

  pageHead: {
    gap: 6,
    marginBottom: 4,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.textSecondary,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
    textAlign: 'left',
  },

  pageSub: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'left',
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    width: '100%',
  },

  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  quickCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 18,
    gap: 8,
    alignItems: 'flex-start',
  },

  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'left',
  },

  quickSub: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'left',
  },

  steps: {
    borderTopWidth: 1,
    borderTopColor: COLORS.track,
    marginTop: 4,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },

  stepDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.track,
  },

  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  stepText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  bottomSpace: {
    height: 12,
  },
});
