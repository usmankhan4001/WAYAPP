import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, Server, Shield } from 'lucide-react-native';
import { getServerUrl, setServerUrl, clearAuthToken } from '../../lib/api';

export default function MobileSettingsScreen() {
  const router = useRouter();
  const [serverUrl, setUrl] = useState('');
  const [saved, setSaved] = useState(false);

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
          <Text style={styles.sectionTitle}>Backend Server Connection</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://app.wayapp.io"
              placeholderTextColor="#64748b"
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
            <LogOut color="#f87171" size={16} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16 },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionTitle: { color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  logoutText: { color: '#f87171', fontSize: 13, fontWeight: '700' },
});
