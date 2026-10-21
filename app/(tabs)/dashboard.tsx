import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import BrandBackground from '@/components/BrandBackground';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getProfile,
  getAllProfiles,
  updateUserRole,
  type AssignableRole,
  type Profile,
  type Role,
} from '@/lib/profiles';
import {
  getAdminOverview,
  getAttendanceTrends,
  type AdminOverview,
  type EventTrend,
} from '@/lib/attendance';
import { getTeacherEventSummary, type TeacherEventSummary } from '@/lib/attendance';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [trends, setTrends] = useState<EventTrend[]>([]);
  const [mySummary, setMySummary] = useState<TeacherEventSummary[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      const profile = await getProfile(user.id);
      const r = profile?.role ?? 'student';
      setRole(r);
      if (r === 'admin') {
        const [ov, tr, allUsers] = await Promise.all([
          getAdminOverview(),
          getAttendanceTrends(10),
          getAllProfiles(),
        ]);
        setOverview(ov);
        setTrends(tr);
        setUsers(allUsers);
      } else if (r === 'teacher') {
        setMySummary(await getTeacherEventSummary(user.id));
      }
      setLoading(false);
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(() => load(true), 10000);
      return () => clearInterval(t);
    }, [load])
  );

  if (loading) {
    return (
      <BrandBackground>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.textOnBackground} />
          <Text style={styles.muted}>Loading dashboard...</Text>
        </View>
      </BrandBackground>
    );
  }

  if (role === 'student') {
    return (
      <BrandBackground>
        <View style={styles.centered}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={COLORS.textSecondary}
          />
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.muted}>
            The dashboard is for Teachers and Admins. As a Student, please check
            your History tab.
          </Text>
        </View>
      </BrandBackground>
    );
  }

  // Teacher: iyang kaugalingong summary (real-time counts).
  if (role === 'teacher') {
    const total = mySummary.reduce((s, e) => s + e.attendeeCount, 0);
    const late = mySummary.reduce((s, e) => s + e.lateCount, 0);
    return (
      <BrandBackground>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.screenTitle}>Dashboard</Text>
          <Text style={styles.liveHint}>● Live — auto-refresh every 10s</Text>
          <View style={styles.grid}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{mySummary.length}</Text>
              <Text style={styles.statLabel}>My Events</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{total}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{total - late}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
          </View>
          {mySummary.map((e) => (
            <View key={e.eventId} style={styles.card}>
              <Text style={styles.cardTitle}>{e.title}</Text>
              <Text style={styles.code}>{e.eventCode}</Text>
              <Text style={styles.stats}>
                Present: {e.presentCount} • Late: {e.lateCount} • Total:{' '}
                {e.attendeeCount}
              </Text>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${
                        e.attendeeCount === 0
                          ? 0
                          : Math.round(
                              (e.presentCount / e.attendeeCount) * 100
                            )
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </BrandBackground>
    );
  }

  // Admin: campus-wide centralized dashboard — banner + KPI layout.
  const totalScans = overview?.totalScans ?? 0;
  const presentCount = overview?.presentCount ?? 0;
  const presentRate =
    totalScans === 0 ? 0 : Math.round((presentCount / totalScans) * 100);

  return (
    <BrandBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroEyebrow}>CONTROL CENTER</Text>
              <Text style={styles.heroTitle}>Admin Dashboard</Text>
            </View>
            <View style={styles.livePill}>
              <Text style={styles.livePillText}>● LIVE</Text>
            </View>
          </View>
          <Text style={styles.heroSub}>
            {overview?.totalStudents ?? 0} students • {totalScans} scans •{' '}
            {overview?.totalEvents ?? 0} events
          </Text>
          <View style={styles.heroRateRow}>
            <Text style={styles.heroRate}>{presentRate}% present</Text>
            <View style={styles.heroBar}>
              <View style={[styles.heroBarFill, { width: `${presentRate}%` }]} />
            </View>
          </View>
        </View>
        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.statNum}>{overview?.totalEvents ?? 0}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="qr-code-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.statNum}>{totalScans}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.statNum}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={22} color={COLORS.textPrimary} />
            <Text style={styles.statNum}>{overview?.lateCount ?? 0}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.sectionRow}>
            <Text style={styles.cardTitle}>Campus pulse</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {overview?.totalStudents ?? 0} students
              </Text>
            </View>
          </View>
          <Text style={styles.stats}>
            Scans: {totalScans} • Present: {presentCount} • Late:{' '}
            {overview?.lateCount ?? 0}
          </Text>
          <View style={styles.bar}>
            <View
              style={[styles.barFill, { width: `${presentRate}%` }]}
            />
          </View>
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Event attendance trends</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{trends.length}</Text>
          </View>
        </View>
        {trends.length === 0 ? (
          <Text style={styles.muted}>No events yet.</Text>
        ) : (
          trends.map((t, i) => (
            <View key={t.eventCode} style={styles.card}>
              <View style={styles.trendTop}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <View style={styles.trendTitleWrap}>
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <Text style={styles.code}>{t.eventCode}</Text>
                </View>
                <Text style={styles.trendTotal}>{t.attendeeCount}</Text>
              </View>
              <Text style={styles.stats}>
                Total: {t.attendeeCount} • Present: {t.presentCount} • Late:{' '}
                {t.lateCount}
              </Text>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${
                        t.attendeeCount === 0
                          ? 0
                          : Math.round((t.presentCount / t.attendeeCount) * 100)
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>User management</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{users.length}</Text>
          </View>
        </View>
        <Text style={styles.mutedLeft}>
          Promote users to teacher here. The administrator account is read-only
          — only one admin is allowed.
        </Text>
        {userMsg && <Text style={styles.liveHint}>{userMsg}</Text>}
        {users.map((u) => (
          <View key={u.id} style={styles.card}>
            <View style={styles.userTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userTitleWrap}>
                <Text style={styles.cardTitle}>
                  {u.full_name ?? u.email.split('@')[0]}
                </Text>
                <Text style={styles.code}>{u.email}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{u.role}</Text>
              </View>
            </View>
            {u.role === 'admin' ? (
              <Text style={styles.liveHint}>
                Administrator — read-only. Only one admin is allowed.
              </Text>
            ) : (
              <>
                {u.id === user?.id && (
                  <Text style={styles.liveHint}>
                    This is you — role locked.
                  </Text>
                )}
                <View style={styles.roleRow}>
                  {(['student', 'teacher'] as AssignableRole[]).map((r) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <Pressable
                        key={r}
                        disabled={isSelf}
                        style={[
                          styles.roleChip,
                          u.role === r && styles.roleChipActive,
                          isSelf && styles.roleChipDisabled,
                        ]}
                        onPress={async () => {
                          const { error } = await updateUserRole(u.id, r);
                          setUserMsg(
                            error ? `Failed: ${error}` : `${u.email} → ${r}`
                          );
                          if (!error) load(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            u.role === r && styles.roleChipTextActive,
                          ]}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingTop: 48, gap: 12 },
  centered: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textOnBackground,
  },
  liveHint: { fontSize: 12, color: COLORS.mutedOnBackground, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textOnBackground },
  muted: { fontSize: 14, color: COLORS.mutedOnBackground, textAlign: 'center' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textOnBackground,
    marginTop: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statNum: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  code: { fontSize: 13, color: COLORS.textSecondary },
  stats: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  bar: {
    height: 8,
    backgroundColor: COLORS.track,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: 8, backgroundColor: COLORS.primary },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  roleChipActive: { borderColor: COLORS.border, backgroundColor: COLORS.primary },
  roleChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  roleChipTextActive: { color: COLORS.textOnBackground, fontWeight: '700' },
  roleChipDisabled: { opacity: 0.4 },
  // New admin banner layout
  hero: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitleWrap: { flex: 1, gap: 2 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.mutedOnBackground,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textOnBackground },
  heroSub: { fontSize: 13, fontWeight: '600', color: COLORS.mutedOnBackground },
  heroRateRow: { gap: 6, marginTop: 4 },
  heroRate: { fontSize: 14, fontWeight: '800', color: COLORS.textOnBackground },
  heroBar: {
    height: 10,
    backgroundColor: COLORS.track,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  heroBarFill: { height: 10, backgroundColor: COLORS.success, borderRadius: 5 },
  livePill: {
    backgroundColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  livePillText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.textOnPrimary },
  mutedLeft: { fontSize: 13, color: COLORS.mutedOnBackground },
  trendTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 14, fontWeight: '800', color: COLORS.textOnPrimary },
  trendTitleWrap: { flex: 1 },
  trendTotal: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.textOnPrimary },
  userTitleWrap: { flex: 1 },
  roleBadge: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
});
