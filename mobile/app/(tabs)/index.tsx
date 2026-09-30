import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MessageSquarePlus, Send, UserPlus, MessageCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react-native';
import { mobileApiFetch } from '../../lib/api';
import { theme } from '../../lib/theme';

const c = theme.dark;

type Range = 'today' | '7d' | '30d';
const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

interface Metric { value: number; change: number | null }
interface Attention { count: number; contacts: { id: string; name: string }[] }
interface Summary {
  user?: { name?: string };
  today: { sent: Metric; delivered: Metric; read: Metric; replies: Metric };
  needsAttention: { unansweredChats: Attention; repliesClosingSoon: Attention; failedMessages: Attention };
  repliesOverTime: { label: string; current: number; previous: number }[];
  recentChats: { id: string; contact: { id: string; name: string }; preview: string; unreadCount: number }[];
}

export default function HomeScreen() {
  const router = useRouter();
  const [range, setRange] = useState<Range>('today');
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<Summary>({
    queryKey: ['mobile_home', range],
    queryFn: () => mobileApiFetch(`/api/dashboard/summary?range=${range}`),
  });

  const first = data?.user?.name?.trim().split(/\s+/)[0];
  const actions = [
    { label: 'New chat', icon: MessageSquarePlus, go: () => router.push('/(tabs)/inbox') },
    { label: 'New broadcast', icon: Send, go: () => router.push('/(tabs)/campaigns') },
    { label: 'Add contacts', icon: UserPlus, go: () => router.push('/(tabs)/contacts') },
  ];
  const max = Math.max(1, ...(data?.repliesOverTime.map((p) => Math.max(p.current, p.previous)) ?? [1]));

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />}
      >
        <Text style={s.h1}>{first ? `Hi, ${first}` : 'Welcome back'}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.actions}>
          {actions.map(({ label, icon: Icon, go }) => (
            <Pressable key={label} onPress={go} style={s.action} accessibilityRole="button">
              <Icon color={c.primary} size={16} />
              <Text style={s.actionText}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={c.primary} style={s.center} />
        ) : isError || !data ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>We could not load your dashboard</Text>
            <Text style={s.muted}>Check your connection and try again.</Text>
            <Pressable onPress={() => refetch()} style={s.retry} accessibilityRole="button">
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <View style={s.rowBetween}>
                <Text style={s.cardTitle}>Numbers</Text>
                <View style={s.chips}>
                  {RANGES.map((r) => (
                    <Pressable key={r.value} onPress={() => setRange(r.value)} style={[s.chip, range === r.value && s.chipOn]}>
                      <Text style={[s.chipText, range === r.value && s.chipTextOn]}>{r.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={s.grid}>
                {(['sent', 'delivered', 'read', 'replies'] as const).map((k) => (
                  <View key={k} style={s.stat}>
                    <Text style={s.muted}>{k[0].toUpperCase() + k.slice(1)}</Text>
                    <Text style={s.value}>{data.today[k].value}</Text>
                    {data.today[k].change != null && (
                      <Text style={[s.change, { color: (data.today[k].change as number) >= 0 ? c.success : c.destructive }]}>
                        {(data.today[k].change as number) >= 0 ? '+' : ''}
                        {data.today[k].change}%
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Needs attention</Text>
              {[
                { key: 'u', icon: MessageCircle, title: 'Chats waiting for a reply', item: data.needsAttention.unansweredChats },
                { key: 'c', icon: Clock, title: 'Replies closing soon', item: data.needsAttention.repliesClosingSoon },
                { key: 'f', icon: AlertCircle, title: 'Messages that failed', item: data.needsAttention.failedMessages },
              ].map(({ key, icon: Icon, title, item }) => (
                <Pressable key={key} onPress={() => router.push('/(tabs)/inbox')} style={s.attn}>
                  <Icon color={c.primary} size={20} />
                  <View style={s.flex}>
                    <Text style={s.rowTitle}>{title}</Text>
                    <Text style={s.muted} numberOfLines={1}>
                      {item.count === 0 ? 'None' : item.contacts.map((x) => x.name).join(', ')}
                    </Text>
                  </View>
                  <Text style={s.rowTitle}>{item.count}</Text>
                  <ChevronRight color={c['muted-foreground']} size={16} />
                </Pressable>
              ))}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Replies over time</Text>
              {data.repliesOverTime.every((p) => p.current + p.previous === 0) ? (
                <Text style={s.muted}>No replies yet. When customers answer, the trend shows here.</Text>
              ) : (
                <View style={s.bars}>
                  {data.repliesOverTime.map((p, i, all) => (
                    <View key={p.label + i} style={s.barCol}>
                      <View style={[s.bar, { height: Math.max(3, (p.current / max) * 90), backgroundColor: i === all.length - 1 ? c['chart-highlight'] : c['chart-1'] }]} />
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Recent chats</Text>
              {data.recentChats.length === 0 ? (
                <Text style={s.muted}>No chats yet. Start a conversation with a customer.</Text>
              ) : (
                data.recentChats.map((ch) => (
                  <Pressable key={ch.id} onPress={() => router.push(`/chat/${ch.contact.id}`)} style={s.attn}>
                    <View style={s.flex}>
                      <Text style={s.rowTitle}>{ch.contact.name}</Text>
                      <Text style={s.muted} numberOfLines={1}>{ch.preview}</Text>
                    </View>
                    {ch.unreadCount > 0 && <Text style={s.badge}>{ch.unreadCount}</Text>}
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, gap: 14 },
  center: { marginTop: 40 },
  flex: { flex: 1 },
  h1: { color: c.foreground, fontSize: 24, fontWeight: '700' },
  actions: { gap: 8, paddingBottom: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: c.raised },
  actionText: { color: c.foreground, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.border },
  cardTitle: { color: c.foreground, fontSize: 16, fontWeight: '700' },
  muted: { color: c['muted-foreground'], fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: c.raised },
  chipOn: { backgroundColor: c.primary },
  chipText: { color: c.foreground, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: c['primary-foreground'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  stat: { width: '50%', gap: 2 },
  value: { color: c.foreground, fontSize: 26, fontWeight: '700' },
  change: { fontSize: 12, fontWeight: '600' },
  attn: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  rowTitle: { color: c.foreground, fontSize: 15, fontWeight: '600' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 2 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  badge: { color: c['primary-foreground'], backgroundColor: c.primary, fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  retry: { alignSelf: 'flex-start', paddingHorizontal: 16, height: 40, justifyContent: 'center', borderRadius: 20, backgroundColor: c.primary },
  retryText: { color: c['primary-foreground'], fontWeight: '700' },
});
