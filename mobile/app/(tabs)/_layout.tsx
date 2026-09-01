import React from 'react';
import { Tabs } from 'expo-router';
import { MessageSquare, Users, Send, Settings } from 'lucide-react-native';

import { theme } from '../../lib/theme';

// Shared design tokens (dark palette — the Expo app is dark-default).
const t = theme.dark;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.foreground,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t['muted-foreground'],
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Broadcasts',
          tabBarIcon: ({ color, size }) => <Send color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
