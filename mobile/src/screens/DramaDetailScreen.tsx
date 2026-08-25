/**
 * DramaDetailScreen — Series detail + episode list
 *
 * Shows the series poster/description and every episode with its lock state.
 * Tapping a free or unlocked episode opens the player; tapping a locked one
 * opens the paywall. "Start / Continue Watching" jumps straight into the
 * first available episode.
 *
 * The list re-fetches when the auth token or unlocksVersion changes so newly
 * unlocked episodes become playable immediately.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Play,
  Lock,
  Clock,
  Film,
  Layers,
  CheckCircle,
  Key,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { fetchDrama, fetchEpisodes } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Drama, Episode, RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'DramaDetail'>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMinutes(seconds: number): string {
  const total = Math.max(1, Math.round(seconds / 60));
  return `${total} min`;
}

export default function DramaDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRoute>();
  const { dramaId } = route.params;

  const { token, isUnlocked, unlocksVersion } = useAuth();

  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextDrama, nextEpisodes] = await Promise.all([
        fetchDrama(dramaId),
        fetchEpisodes(dramaId, token ?? undefined),
      ]);
      setDrama(nextDrama);
      setEpisodes(nextEpisodes);
    } catch (e) {
      setError('Could not load this series. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [dramaId, token]);

  // Reload when auth changes so unlock/paywall results are reflected.
  useEffect(() => {
    load();
  }, [load, unlocksVersion]);

  const canPlay = useCallback(
    (episode: Episode) => !episode.isLocked || isUnlocked(episode.id),
    [isUnlocked]
  );

  const openEpisode = useCallback(
    (episode: Episode) => {
      if (canPlay(episode) && drama) {
        navigation.navigate('EpisodePlayer', {
          dramaId,
          episodeNumber: episode.episodeNumber,
        });
      } else if (drama) {
        navigation.navigate('Paywall', { episode, drama });
      }
    },
    [canPlay, drama, dramaId, navigation]
  );

  const openStartWatching = useCallback(() => {
    if (!episodes.length || !drama) return;
    const next = episodes.find((ep) => canPlay(ep)) ?? episodes[0];
    if (canPlay(next)) {
      navigation.navigate('EpisodePlayer', {
        dramaId,
        episodeNumber: next.episodeNumber,
      });
    } else {
      navigation.navigate('Paywall', { episode: next, drama });
    }
  }, [canPlay, drama, dramaId, episodes, navigation]);

  const header = useMemo(() => {
    if (!drama) return null;

    const hasStarted = episodes.some((ep) => isUnlocked(ep.id));
    const totalSeconds = episodes.reduce((sum, ep) => sum + ep.durationSeconds, 0);
    const playableCount = episodes.filter((ep) => canPlay(ep)).length;
    const lockedCount = episodes.length - playableCount;

    return (
      <>
        {/* Hero */}
        <View style={styles.hero}>
          {drama.thumbnailUrl ? (
            <Image
              source={{ uri: drama.thumbnailUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Text style={styles.posterInitial}>{drama.title.charAt(0)}</Text>
            </View>
          )}
          <LinearGradient
            colors={['rgba(10,10,15,0.1)', 'rgba(10,10,15,0.95)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.heroInfo}>
            <Text style={styles.genre}>{drama.genre}</Text>
            <Text style={styles.title}>{drama.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Film size={13} color={Colors.brand.muted} />
                <Text style={styles.metaChipText}>{episodes.length} episodes</Text>
              </View>
              <View style={styles.metaChip}>
                <Clock size={13} color={Colors.brand.muted} />
                <Text style={styles.metaChipText}>{formatMinutes(totalSeconds)}</Text>
              </View>
              {lockedCount > 0 && (
                <View style={styles.metaChip}>
                  <Lock size={13} color={Colors.brand.muted} />
                  <Text style={styles.metaChipText}>{lockedCount} locked</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Pressable style={styles.ctaBtn} onPress={openStartWatching}>
            <Play size={18} color={Colors.brand.white} fill={Colors.brand.white} />
            <Text style={styles.ctaBtnText}>
              {hasStarted ? 'Continue Watching' : 'Start Watching'}
            </Text>
          </Pressable>
          {episodes.length > 0 && (
            <Text style={styles.availableText}>
              {playableCount} of {episodes.length} episodes available free or unlocked
            </Text>
          )}
        </View>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{drama.description}</Text>
          {drama.tags.length > 0 && (
            <View style={styles.tagRow}>
              {drama.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, styles.episodeSectionTitle]}>
          Episodes
        </Text>
      </>
    );
  }, [drama, episodes, canPlay, isUnlocked, openStartWatching]);

  const renderEpisode = useCallback(
    ({ item }: { item: Episode }) => {
      const playable = canPlay(item);
      const unlocked = isUnlocked(item.id);

      return (
        <Pressable
          style={styles.episodeRow}
          onPress={() => openEpisode(item)}
        >
          <View
            style={[
              styles.episodeNumber,
              playable ? styles.episodeNumberPlayable : styles.episodeNumberLocked,
            ]}
          >
            {playable ? (
              <Text style={styles.episodeNumberText}>{item.episodeNumber}</Text>
            ) : (
              <Lock size={16} color={Colors.brand.muted} />
            )}
          </View>

          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.episodeMetaRow}>
              <Text style={styles.episodeMeta}>
                Episode {item.episodeNumber} · {formatDuration(item.durationSeconds)}
              </Text>
              {playable ? (
                <View style={[styles.statusBadge, styles.statusBadgeFree]}>
                  {unlocked ? (
                    <CheckCircle size={12} color={Colors.ui.success} />
                  ) : null}
                  <Text style={styles.statusBadgeFreeText}>
                    {unlocked ? 'Unlocked' : 'Free'}
                  </Text>
                </View>
              ) : (
                <View style={styles.statusBadge}>
                  <Key size={11} color={Colors.brand.muted} />
                  <Text style={styles.statusBadgeText}>{item.coinCost} coins</Text>
                </View>
              )}
            </View>
          </View>

          <Play
            size={20}
            color={playable ? Colors.brand.red : Colors.brand.muted}
            fill={playable ? Colors.brand.red : 'none'}
          />
        </Pressable>
      );
    },
    [canPlay, isUnlocked, openEpisode]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={Colors.brand.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Series</Text>
        <View style={styles.backBtnSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.red} />
          <Text style={styles.loadingText}>Loading series...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(ep) => ep.id}
          renderItem={renderEpisode}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No episodes have been released yet.</Text>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.card,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnSpacer: {
    width: 40,
  },
  topBarTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
  },
  errorText: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.brand.red,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryBtnText: {
    color: Colors.brand.white,
    fontWeight: Typography.weights.bold,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  hero: {
    height: 220,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  posterFallback: {
    backgroundColor: Colors.brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterInitial: {
    fontSize: 72,
    color: Colors.brand.red,
    fontWeight: Typography.weights.extrabold,
  },
  heroInfo: {
    padding: Spacing.md,
  },
  genre: {
    color: Colors.brand.red,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
    lineHeight: 36,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  metaChipText: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  ctaSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.red,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    width: '100%',
  },
  ctaBtnText: {
    color: Colors.brand.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  availableText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
  },
  about: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  description: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  tag: {
    borderWidth: 1,
    borderColor: Colors.brand.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  tagText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    textTransform: 'capitalize',
  },
  episodeSectionTitle: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border,
    gap: Spacing.md,
  },
  episodeNumber: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  episodeNumberPlayable: {
    borderColor: Colors.brand.red,
    backgroundColor: 'rgba(232,0,61,0.08)',
  },
  episodeNumberLocked: {
    borderColor: Colors.brand.border,
    backgroundColor: Colors.brand.card,
  },
  episodeNumberText: {
    color: Colors.brand.red,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  episodeMeta: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.brand.card,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeFree: {
    borderColor: 'rgba(34,197,94,0.5)',
  },
  statusBadgeText: {
    color: Colors.brand.muted,
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
  },
  statusBadgeFreeText: {
    color: Colors.ui.success,
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
  },
  emptyText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    padding: Spacing.xl,
  },
});
