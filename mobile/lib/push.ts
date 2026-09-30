import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { mobileApiFetch } from './api';

const TOKEN_KEY = 'wayapp_push_token';

/** Call once at startup: how notifications look while the app is open, plus the Android channel. */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    }).catch((err) => console.warn('Could not create notification channel:', err));
  }
}

/** Ask permission, fetch the Expo token and register it with the server. Safe to call repeatedly. */
export async function registerForPush(): Promise<string | null> {
  try {
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    if (!projectId) {
      console.warn('Push notifications disabled: extra.eas.projectId is missing from app.json. Run "eas init".');
      return null;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!tokenData?.data) return null;
    await mobileApiFetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ expoToken: tokenData.data, platform: Platform.OS }),
    });
    await SecureStore.setItemAsync(TOKEN_KEY, tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.warn('Push registration failed:', err);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/** Tell the server to stop notifying this phone (call BEFORE clearing the auth token). */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await getStoredPushToken();
    if (token) {
      await mobileApiFetch('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ token }) });
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (err) {
    console.warn('Push unregister failed:', err);
  }
}

export async function savePushPrefs(prefs: {
  muted?: boolean;
  quietStart?: number | null;
  quietEnd?: number | null;
}): Promise<void> {
  const token = await getStoredPushToken();
  if (!token) throw new Error('Notifications are not switched on for this phone yet.');
  await mobileApiFetch('/api/push/subscribe', { method: 'PATCH', body: JSON.stringify({ token, ...prefs }) });
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0).catch(() => {});
}
