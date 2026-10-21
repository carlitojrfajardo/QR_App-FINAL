import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

export default function ScanScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const lockRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRole(null);
      setRoleLoading(false);
      return;
    }
    getProfile(user.id).then((profile) => {
      if (!active) return;
      setRole(profile?.role ?? 'student');
      setRoleLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  // Admins don't check in — send them back to Home if they reach /scan
  // through a deep link or an old navigation state.
  useEffect(() => {
    if (role === 'admin') router.replace('/');
  }, [role, router]);

  if (roleLoading) {
    return <View style={styles.container} />;
  }

  if (role === 'admin') {
    return <View style={styles.container} />;
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.permIcon}>
          <Ionicons
            name="camera-outline"
            size={40}
            color={COLORS.textPrimary}
          />
        </View>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          Grant camera permission to scan attendance QR codes.
        </Text>
        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera-outline"
          onPress={requestPermission}
        />
      </View>
    );
  }

  const submitPayload = (raw: string) => {
    const data = raw.trim();
    if (!data || lockRef.current) return;
    lockRef.current = true;
    setScanned(true);
    setProcessing(true);
    setLastData(data);
    const studentId = user?.id ?? 'unknown';
    registerAttendance(data, studentId).then((result) => {
      setMessage(result.message);
      setSuccess(result.success);
      setProcessing(false);
    });
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    submitPayload(data);
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) {
      setMessage('Type the event code (e.g. EVT-2026-0001).');
      setSuccess(false);
      return;
    }
    // Fallback kung dili ma-detect sa camera: buhatan ug v:1 payload gikan sa code.
    // Walay start/end dinhi, mao nga walay time-window block —
    // ang event lookup + attendance insert gihapon ang mag-validate.
    submitPayload(JSON.stringify({ v: 1, event: code }));
  };

  const resetScanner = () => {
    lockRef.current = false;
    setScanned(false);
    setProcessing(false);
    setMessage(null);
    setLastData(null);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      {/* Header pill */}
      <View style={styles.topBar} pointerEvents="none">
        <View style={styles.topPill}>
          <Ionicons name="scan-outline" size={16} color={COLORS.textOnBackground} />
          <Text style={styles.topPillText}>
            {scanned ? 'CODE CAPTURED' : 'POINT AT QR'}
          </Text>
        </View>
      </View>
      {/* Corner-bracket viewfinder */}
      {!scanned && (
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
      )}
      {/* Bottom sheet */}
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {message ? (
            <View style={styles.resultWrap}>
              <View
                style={[
                  styles.statusRow,
                  success ? styles.statusOk : styles.statusErr,
                ]}
              >
                <Ionicons
                  name={
                    success
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={26}
                  color={success ? COLORS.success : COLORS.danger}
                />
                <Text style={styles.statusTitle}>
                  {processing
                    ? 'Checking...'
                    : success
                      ? 'Checked in!'
                      : 'Scan failed'}
                </Text>
              </View>
              <Text
                style={[
                  styles.message,
                  success ? styles.ok : styles.err,
                ]}
              >
                {processing ? 'Checking...' : message}
              </Text>
              {lastData ? (
                <View style={styles.rawBox}>
                  <Text style={styles.raw} numberOfLines={3}>
                    {lastData}
                  </Text>
                </View>
              ) : null}
              <AppButton
                theme="primary"
                title="Scan Again"
                icon="scan-outline"
                onPress={resetScanner}
              />
            </View>
          ) : (
            <View style={styles.manualWrap}>
              <Text style={styles.sheetTitle}>Scan to check in</Text>
              <Text style={styles.sheetSub}>
                Align the QR inside the frame — or type the event code
                below.
              </Text>
              <TextInput
                style={styles.input}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Event code (e.g. EVT-2026-0001)"
                placeholderTextColor={COLORS.mutedOnBackground}
                autoCapitalize="characters"
              />
              <AppButton
                theme="primary"
                title="Submit Code"
                icon="checkmark-outline"
                onPress={handleManualSubmit}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const FRAME = 250;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  topPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textOnBackground,
  },
  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME,
    height: FRAME,
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: COLORS.border,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 14,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sheetSub: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  manualWrap: {
    gap: 10,
  },
  resultWrap: {
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 10,
  },
  statusOk: {
    backgroundColor: '#E8E8E8',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusErr: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  permIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textOnBackground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.mutedOnBackground,
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textOnBackground,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  ok: {
    color: COLORS.success,
  },
  err: {
    color: COLORS.danger,
  },
  rawBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
  },
  raw: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
