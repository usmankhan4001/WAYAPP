import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, Server, Shield } from 'lucide-react-native';
import { getServerUrl, setServerUrl, clearAuthToken } from '../../lib/api';
import { registerForPush, unregisterPush, savePushPrefs } from '../../lib/push';
import { theme } from '../../lib/theme';

const c = theme.dark;

export default function MobileSettingsScreen() {
  const router = useRouter();
  const [serverUrl, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [quietOn, setQuietOn] = useState(false);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(7);

  const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;
  const step = (h: number, d: number) => (h + d + 24) % 24;

  const persist = async (prefs: Parameters<typeof savePushPrefs>[0]) => {
    try {
      await savePushPrefs(prefs);
    } catch (err: any) {
      Alert.alert('Could not save', err.message || 'Please try again.');
    }
  };

  const toggleNotifications = async (on: boolean) => {
    setNotifOn(on);
    if (on) {
      const token = await registerForPush();
      if (!token) {
        setNotifOn(false);
        Alert.alert('Notifications are off', 'Allow notifications for WAYAPP in your phone settings, then try again.');
        return;
      }
    }
    await persist({ muted: !on });
  };

  const toggleQuiet = (on: boolean) => {
    setQuietOn(on);
    persist(on ? { quietStart, quietEnd } : { quietStart: null, quietEnd: null });
  };

  const changeHour = (which: 'start' | 'end', d: number) => {
    const next = step(which === 'start' ? quietStart : quietEnd, d);
    if (which === 'start') setQuietStart(next);
    else setQuietEnd(next);
    persist(which === 'start' ? { quietStart: next } : { quietEnd: next });
  };

  useEffect(() => {
    getServerUrl().then(setUrl);
  }, []);

  const handleSaveUrl = async () => {
    if (!serverUrl.trim()) return;
    await setServerUrl(serverUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from WAYAPP?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await unregisterPush();
          await clearAuthToken();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Tell me when a customer messages</Text>
            <Switch value={notifOn} onValueChange={toggleNotifications} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Quiet hours (no alerts)</Text>
            <Switch value={quietOn} onValueChange={toggleQuiet} />
          </View>
          {quietOn && (
            <View style={styles.row}>
              {(['start', 'end'] as const).map((w) => (
                <View key={w} style={styles.stepper}>
                  <Text style={styles.rowLabel}>{w === 'start' ? 'From' : 'Until'}</Text>
                  <TouchableOpacity onPress={() => changeHour(w, -1)} style={styles.stepBtn}><Text style={styles.saveText}>-</Text></TouchableOpacity>
                  <Text style={styles.rowLabel}>{hourLabel(w === 'start' ? quietStart : quietEnd)}</Text>
                  <TouchableOpacity onPress={() => changeHour(w, 1)} style={styles.stepBtn}><Text style={styles.saveText}>+</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backend Server Connection</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://app.wayapp.io"
              placeholderTextColor={c["muted-foreground"]}
              value={serverUrl}
              onChangeText={setUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
              <Text style={styles.saveText}>{saved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut color={c.destructive} size={16} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16 },
  section: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.secondary,
  },
  sectionTitle: { color: c['muted-foreground'], fontSize: 12, fontWeight: '700', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: c.foreground,
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveText: { color: c.foreground, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: c.foreground, fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { backgroundColor: c.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  logoutText: { color: c.destructive, fontSize: 13, fontWeight: '700' },
});
