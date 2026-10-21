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
import BrandBackground from '@/components/BrandBackground';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  createEvent,
  updateEvent,
  closeEvent,
  reopenEvent,
  rotateQrToken,
  getEventsByTeacher,
  getAllEvents,
  getEventByCode,
  type CloudEvent,
} from '@/lib/events';
import { buildSmartQRPayload } from '@/lib/qr';

export default function TeacherScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<'start' | 'end' | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<CloudEvent[]>([]);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    const profile = await getProfile(user.id);
    const r = profile?.role ?? 'student';
    setRole(r);
    setRoleLoading(false);
    if (r === 'teacher') {
      setMyEvents(await getEventsByTeacher(user.id));
    } else if (r === 'admin') {
      setMyEvents(await getAllEvents());
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!user) {
          setRoleLoading(false);
          return;
        }
        await loadEvents();
        if (!active) return;
      })();
      return () => {
        active = false;
      };
    }, [user, loadEvents])
  );

  if (roleLoading) {
    return (
      <BrandBackground>
        <View style={styles.centered}>
          <Text style={styles.muted}>Checking your account...</Text>
        </View>
      </BrandBackground>
    );
  }

  if (role !== 'teacher' && role !== 'admin') {
    return (
      <BrandBackground>
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
      </BrandBackground>
    );
  }

  const handleQuickDuration = (minutes: number) => {
    setEndDate(new Date(startDate.getTime() + minutes * 60 * 1000));
  };

  const refreshQr = async (code: string, minutes = 60) => {
    const res = await rotateQrToken(code, minutes);
    if (res.error || !res.token || !res.expiresAt) {
      setMessage('Could not rotate QR. Please try again.');
      return;
    }
    setPayload(buildSmartQRPayload(code, res.token, res.expiresAt));
    setQrExpiry(res.expiresAt);
    const duration =
      minutes >= 60
        ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}`
        : `${minutes} min`;
    setMessage(
      `Smart QR rotated! Valid for ${duration}. Old screenshots won't work.`
    );
    loadEvents();
  };

  const handleCreateEvent = async () => {
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
      venue: venue.trim(),
      description: description.trim(),
    };

    // Edit mode: update ra, dili create.
    if (editingCode) {
      const { error } = await updateEvent(editingCode, {
        title: eventData.title,
        start: eventData.start,
        end: eventData.end,
        venue: eventData.venue,
        description: eventData.description,
      });
      if (error) {
        setMessage('Could not update the event. Please try again.');
        return;
      }
      setMessage('Event updated!');
      setEditingCode(null);
      loadEvents();
      return;
    }

    const { error } = await createEvent(eventData);
    if (error) {
      setMessage('Could not save the event. Please try again.');
      return;
    }
    // Smart QR dayon: rotate para naay token + 5-min expiry.
    setMessage('Event saved! Generating Smart QR...');
    await refreshQr(eventData.eventId, 60);
    loadEvents();
  };

  const handleEdit = async (code: string) => {
    const ev = await getEventByCode(code);
    if (!ev) return;
    setEditingCode(code);
    setEventId(ev.event_code);
    setTitle(ev.title);
    setVenue(ev.venue ?? '');
    setDescription(ev.description ?? '');
    if (ev.start_time) setStartDate(new Date(ev.start_time));
    if (ev.end_time) setEndDate(new Date(ev.end_time));
    setMessage(`Editing ${code} — update the fields then press Update.`);
  };

  const handleCloseToggle = async (ev: CloudEvent) => {
    if (ev.status === 'closed') {
      const { error } = await reopenEvent(ev.event_code);
      setMessage(error ? 'Could not reopen.' : `${ev.event_code} reopened.`);
    } else {
      const { error } = await closeEvent(ev.event_code);
      setMessage(error ? 'Could not close.' : `${ev.event_code} closed. Scans blocked.`);
    }
    loadEvents();
  };

  return (
    <BrandBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {editingCode ? `Edit ${editingCode}` : 'Create Event'}
        </Text>

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
          editable={!editingCode}
        />

        <Text style={styles.label}>Venue</Text>
        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="Gymnasium / Room 301"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="What is this event about?"
          placeholderTextColor={COLORS.textSecondary}
          multiline
        />

        <Text style={styles.label}>Start Time</Text>
        <Pressable
          style={styles.input}
          onPress={() => {
            setEditTarget('start');
            setEditingPart('date');
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
          {[1, 2, 3, 4, 5].map((hours) => (
            <Pressable
              key={hours}
              style={styles.chip}
              onPress={() => handleQuickDuration(hours * 60)}
            >
              <Text style={styles.chipText}>
                +{hours} {hours === 1 ? 'hour' : 'hours'}
              </Text>
            </Pressable>
          ))}
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
          title={editingCode ? 'Update Event' : 'Create Event'}
          icon={editingCode ? 'save-outline' : 'add-outline'}
          onPress={handleCreateEvent}
        />
        {editingCode && (
          <AppButton
            title="Cancel Edit"
            icon="close-outline"
            onPress={() => {
              setEditingCode(null);
              setTitle('');
              setEventId('');
              setVenue('');
              setDescription('');
            }}
          />
        )}

        {payload && (
          <View style={styles.qrCard}>
            <View style={styles.qrBox}>
              <QRCode
                value={payload}
                size={260}
                ecl="L"
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.eventCodeText}>{eventId.trim()}</Text>
            {qrExpiry && (
              <Text style={styles.scanHint}>
                Expires: {new Date(qrExpiry).toLocaleTimeString()}
              </Text>
            )}
            <Text style={styles.scanHint}>
              Smart QR — rotating & time-limited. Screenshots stop working after rotation.
            </Text>
            <View style={styles.qrActions}>
              <Pressable
                style={styles.smallBtn}
                onPress={() => refreshQr(eventId.trim(), 60)}
              >
                <Text style={styles.smallBtnText}>Rotate (1 hour)</Text>
              </Pressable>
              <Pressable
                style={styles.smallBtn}
                onPress={() => refreshQr(eventId.trim(), 120)}
              >
                <Text style={styles.smallBtnText}>Rotate (2 hours)</Text>
              </Pressable>
              <Pressable
                style={styles.smallBtn}
                onPress={() => refreshQr(eventId.trim(), 180)}
              >
                <Text style={styles.smallBtnText}>Rotate (3 hours)</Text>
              </Pressable>
            </View>
            <Text style={styles.payloadText}>{payload}</Text>
          </View>
        )}

        <Text style={[styles.title, { marginTop: 20 }]}>My Events</Text>
        {myEvents.length === 0 ? (
          <Text style={styles.muted}>No events yet.</Text>
        ) : (
          myEvents.map((ev) => (
            <View key={ev.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    ev.status === 'closed' ? styles.closed : styles.open,
                  ]}
                >
                  {ev.status}
                </Text>
              </View>
              <Text style={styles.cardMuted}>
                {ev.event_code}
                {ev.venue ? ` • ${ev.venue}` : ''}
              </Text>
              {ev.description ? (
                <Text style={styles.cardMuted}>{ev.description}</Text>
              ) : null}
              <View style={styles.row}>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => handleEdit(ev.event_code)}
                >
                  <Text style={styles.smallBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => handleCloseToggle(ev)}
                >
                  <Text style={styles.smallBtnText}>
                    {ev.status === 'closed' ? 'Reopen' : 'Close'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => {
                    setEventId(ev.event_code);
                    refreshQr(ev.event_code, 60);
                  }}
                >
                  <Text style={styles.smallBtnText}>Show QR</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
    gap: 4,
  },
  centered: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textOnBackground,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textOnBackground,
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
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  inputText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    color: COLORS.mutedOnBackground,
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
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCodeText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  scanHint: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  payloadText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  muted: {
    fontSize: 14,
    color: COLORS.mutedOnBackground,
    textAlign: 'center',
  },
  cardMuted: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    gap: 6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  open: {
    backgroundColor: COLORS.success,
    color: '#FFFFFF',
  },
  closed: {
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  qrActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  smallBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textOnBackground,
  },
});
