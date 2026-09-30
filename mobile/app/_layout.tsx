import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { configureNotifications, registerForPush } from '../lib/push';
import { theme } from '../lib/theme';

const c = theme.dark;

const queryClient = new QueryClient();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    configureNotifications().then(() => registerForPush());

    const openChat = (response: Notifications.NotificationResponse | null) => {
      const contactId = response?.notification.request.content.data?.contactId;
      if (typeof contactId === 'string' && contactId) setTimeout(() => router.push(`/chat/${contactId}`), 300); // let the navigator mount on cold start
    };
    // Cold start: app was launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then(openChat).catch(() => {});
    // Warm: app is running or backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener(openChat);
    return () => sub.remove();
  }, []);


