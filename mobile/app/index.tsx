import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { setAuthToken, setCurrentUserId, mobileApiFetch, getServerUrl, setServerUrl } from '../lib/api';
import { theme } from '../lib/theme';

const c = theme.dark;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrlInput] = useState('');
  const [showServerField, setShowServerField] = useState(false);

  useEffect(() => {
    getServerUrl().then(setServerUrlInput);
  }, []);

  const handleLogin = async () => {
    if (serverUrl.trim()) {
      await setServerUrl(serverUrl.trim());
    }
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const data = await mobileApiFetch('/api/v1/auth/token', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (data.access_token) {
        await setAuthToken(data.access_token);
        if (data.user?.id) {
          await setCurrentUserId(data.user.id);
        }
        router.replace('/(tabs)/inbox');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.title}>WAYAPP Mobile</Text>
          <Text style={styles.subtitle}>WhatsApp Team Inbox & Broadcast Gateway</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Email</Text>
            <TextInput
              style={styles.input}
              placeholder="name@yourcompany.com"
              placeholderTextColor={c["muted-foreground"]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={c["muted-foreground"]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!email || !password || loading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color={c.foreground} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerField(!showServerField)}
          >
            <Text style={styles.serverToggleText}>
              {showServerField ? 'Hide server settings' : 'Connecting to a different server?'}
            </Text>
          </TouchableOpacity>

          {showServerField && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://your-instance.example.com"
                placeholderTextColor={c["muted-foreground"]}
                value={serverUrl}
                onChangeText={setServerUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: c.foreground,
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: c.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: c['muted-foreground'],
    marginTop: 4,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: c.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: c.secondary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: c['muted-foreground'],
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: c.foreground,
  },
  button: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: c.foreground,
    fontSize: 14,
    fontWeight: '700',
  },
  serverToggle: {
    marginTop: 16,
    alignItems: 'center',
  },
  serverToggleText: {
    color: c['muted-foreground'],
    fontSize: 11,
    fontWeight: '600',
  },
});
