import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { mobileApiFetch } from '../lib/api';
import { theme } from '../lib/theme';

const c = theme.dark;

const queryClient = new QueryClient();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    async function registerPush() {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          if (tokenData?.data) {
            await mobileApiFetch('/api/push/subscribe', {
              method: 'POST',
              body: JSON.stringify({
                expoToken: tokenData.data,
                platform: 'mobile',
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Notification registration skipped:', err);
      }
    }
    registerPush();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.foreground,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat/[id]"
          options={{
            title: 'Chat',
            headerBackTitle: 'Inbox',
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
