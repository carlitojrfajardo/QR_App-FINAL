import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { createEvent } from '@/lib/events';
import { buildQRPayload } from '@/lib/qr';

export default function TeacherScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) {
        setRoleLoading(false);
        return () => {
          active = false;
        };
      }
      getProfile(user.id).then((profile) => {
        if (!active) return;
        setRole(profile?.role ?? 'student');
        setRoleLoading(false);
      });
      return () => {
        active = false;
      };
    }, [user])
  );

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color={COLORS.textSecondary}
        />
        <Text style={styles.title}>Teachers Only</Text>
        <Text style={styles.muted}>
          Only teacher accounts can create events.
        </Text>
      </View>
    );
  }

  const handleQuickDuration = (minutes: number) => {
    setEndDate(new Date(startDate.getTime() + minutes * 60 * 1000));
  };

  const handleCreateEvent = () => {
    setMessage(null);
    if (!title.trim() || !eventId.trim()) {
      setMessage('Event title and code are required.');
      return;
    }
    if (startDate >= endDate) {
      setMessage('Start time must be before end time.');
      return;
    }
    const eventData = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
    createEvent(eventData).then(({ error }) => {
      if (error) {
        setMessage('Could not save the event. Please try again.');
        return;
      }
      setMessage('Event saved! Scan the QR with the Scan tab to test it.');
      setPayload(buildQRPayload(eventData));
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Event</Text>

      <Text style={styles.label}>Event Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Founders Day Assembly"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Event Code</Text>
      <TextInput
        style={styles.input}
        value={eventId}
        onChangeText={setEventId}
        placeholder="EVT-2026-0001"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Start Time</Text>
      <Pressable
        style={styles.input}
        onPress={() => {
          setEditTarget('start');
          setEditingPart(Platform.OS === 'ios' ? 'date' : 'date');
        }}
      >
        <Text style={styles.inputText}>{startDate.toLocaleString()}</Text>
      </Pressable>

      <Text style={styles.label}>End Time</Text>
      <Pressable
        style={styles.input}
        onPress={() => {
          setEditTarget('end');
          setEditingPart('date');
        }}
      >
        <Text style={styles.inputText}>{endDate.toLocaleString()}</Text>
      </Pressable>

      <View style={styles.chips}>
        <Pressable
          style={styles.chip}
          onPress={() => handleQuickDuration(30)}
        >
          <Text style={styles.chipText}>+30 min</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => handleQuickDuration(60)}
        >
          <Text style={styles.chipText}>+1 hour</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => handleQuickDuration(120)}
        >
          <Text style={styles.chipText}>+2 hours</Text>
        </Pressable>
      </View>

      {editTarget && (
        <DateTimePicker
          value={editTarget === 'start' ? startDate : endDate}
          mode={editingPart}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            if (Platform.OS === 'android') {
              if (editingPart === 'date' && selected) {
                const cur =
                  editTarget === 'start' ? startDate : endDate;
                const next = new Date(cur);
                next.setFullYear(
                  selected.getFullYear(),
                  selected.getMonth(),
                  selected.getDate()
                );
                if (editTarget === 'start') setStartDate(next);
                else setEndDate(next);
                setEditingPart('time');
              } else {
                if (selected) {
                  const cur =
                    editTarget === 'start' ? startDate : endDate;
                  const next = new Date(cur);
                  next.setHours(
                    selected.getHours(),
                    selected.getMinutes()
                  );
                  if (editTarget === 'start') setStartDate(next);
                  else setEndDate(next);
                }
                setEditTarget(null);
                setEditingPart('date');
              }
            } else if (selected) {
              if (editTarget === 'start') setStartDate(selected);
              else setEndDate(selected);
            }
          }}
        />
      )}
      {Platform.OS === 'ios' && editTarget && (
        <AppButton
          title="Done"
          icon="checkmark-outline"
          onPress={() => setEditTarget(null)}
        />
      )}

      {message && <Text style={styles.message}>{message}</Text>}

      <AppButton
        theme="primary"
        title="Create Event"
        icon="add-outline"
        onPress={handleCreateEvent}
      />

      {payload && (
        <View style={styles.qrCard}>
          <QRCode value={payload} size={200} />
          <Text style={styles.payloadText}>{payload}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    gap: 4,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  chip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginVertical: 8,
  },
  qrCard: {
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  payloadText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  muted: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
