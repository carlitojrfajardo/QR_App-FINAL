import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';
      setRole(currentRole);

      if (currentRole === 'teacher' || currentRole === 'admin') {
        // Admin makakita pud diri (handled fully sa Dashboard tab).
        // Para sa teacher: real-time monitoring via polling sa ubos.
        const { getAllEvents } = await import('@/lib/events');
        if (currentRole === 'admin') {
          const all = await getAllEvents();
          // Reuse teacher view shape: kuhaon ang attendance per event.
          const events = await getTeacherEventAttendance(user.id);
          // Admin: kung walay kaugalingong events, pakita gihapon note.
          // Full campus view naa sa Dashboard tab.
          setTeacherEvents(events);
          if (all.length === 0) setTeacherEvents([]);
        } else {
          const events = await getTeacherEventAttendance(user.id);
          setTeacherEvents(events);
        }
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id);
        setStudentRecords(records);
        setTeacherEvents([]);
      }
      setLoading(false);
    },
    [user]
  );

  // Real-time monitoring: auto-refresh matag 10s samtang naa sa screen.
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(() => load(true), 10000);
      return () => clearInterval(t);
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.textOnBackground} />
        <Text style={styles.muted}>Loading records...</Text>
      </View>
    );
  }

  if (role === 'teacher' || role === 'admin') {
    if (teacherEvents.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.title}>No events yet</Text>
          <Text style={styles.muted}>
            {role === 'admin'
              ? 'Campus-wide view is in the Dashboard tab.'
              : 'Create an event in the Teacher tab to see attendance here.'}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={teacherEvents}
        keyExtractor={(item) => item.eventId}
        ListHeaderComponent={
          <View>
            <Text style={styles.screenTitle}>History</Text>
            <Text style={styles.liveHint}>
              ● Live — auto-refresh every 10s
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          // Event date sama sa Image 2: created_at, fallback sa startTime
          const eventDate = item.createdAt ?? item.startTime;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{item.attendeeCount}</Text>
                </View>
              </View>
              <Text style={styles.code}>{item.eventCode}</Text>
              {eventDate ? (
                <Text style={styles.code}>
                  {new Date(eventDate).toLocaleString()}
                </Text>
              ) : null}
              <Text style={styles.stats}>
                Present: {item.presentCount} • Late: {item.lateCount}
              </Text>
              <View style={styles.divider} />
              {/* Makita ang student sa ubos if naka-scan na, sama sa Image 2 */}
              {item.attendees.length === 0 ? (
                <Text style={styles.emptyScans}>No scans yet</Text>
              ) : (
                item.attendees.map((a) => (
                  <View key={`${item.eventId}-${a.studentId}`} style={styles.attRow}>
                    <View style={styles.attTop}>
                      <Text style={styles.attName}>
                        {a.studentName ?? shortId(a.studentId)}
                      </Text>
                      <Text
                        style={[
                          styles.statusBadge,
                          a.status === 'late'
                            ? styles.lateBadge
                            : styles.presentBadge,
                        ]}
                      >
                        {a.status === 'late' ? 'LATE' : 'PRESENT'}
                      </Text>
                    </View>
                    <Text style={styles.attTime}>
                      {new Date(a.scannedAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          );
        }}
      />
    );
  }

  if (studentRecords.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No records yet</Text>
        <Text style={styles.muted}>
          Scan an event QR code to record your attendance.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={studentRecords}
      ListHeaderComponent={<Text style={styles.screenTitle}>History</Text>}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.eventTitle}</Text>
            <Text
              style={[
                styles.statusBadge,
                item.status === 'late' ? styles.lateBadge : styles.presentBadge,
              ]}
            >
              {item.status === 'late' ? 'LATE' : 'PRESENT'}
            </Text>
          </View>
          <Text style={styles.code}>{item.eventId}</Text>
          <Text style={styles.attTime}>
            {new Date(item.scannedAt).toLocaleString()}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    paddingTop: 48,
    gap: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textOnBackground,
    marginBottom: 4,
  },
  liveHint: {
    fontSize: 12,
    color: COLORS.mutedOnBackground,
    fontWeight: '600',
    marginBottom: 8,
  },
  stats: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  emptyScans: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 4,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textOnBackground,
  },
  muted: {
    fontSize: 14,
    color: COLORS.mutedOnBackground,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 18,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  code: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  attRow: {
    paddingVertical: 6,
  },
  attTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  attTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  presentBadge: {
    backgroundColor: COLORS.success,
    color: COLORS.textOnPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lateBadge: {
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
