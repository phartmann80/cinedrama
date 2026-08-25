/**
 * EpisodePlayerScreen — Full-screen single-episode player
 *
 * Opens from the Drama Detail episode list. Fetches the one episode (with the
 * auth token so a signed URL is returned when unlocked), renders it with
 * expo-av, and provides previous / next episode controls.
 *
 * Locked episodes show a gate overlay that routes into the paywall.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Lock,
  Key,
  CheckCircle,
} from 'lucide-react-native';
import { Colors, Typography, Spacing } from '../constants/theme';
import { fetchDrama, fetchEpisodes } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Drama, Episode, RootStackParamList } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type PlayerRoute = RouteProp<RootStackParamList, 'EpisodePlayer'>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function EpisodePlayerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<PlayerRoute>();
  const { dramaId, episodeNumber } = route.params;

  const { token, isUnlocked, unlocksVersion } = useAuth();

  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const videoRef = useRef<Video>(null);
  const lastTap = useRef(0);
  const statusRef = useRef<AVPlaybackStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextDrama, nextEpisodes] = await Promise.all([
        fetchDrama(dramaId),
        fetchEpisodes(dramaId, token ?? undefined),
      ]);
      const nextEpisode =
        nextEpisodes.find((ep) => ep.episodeNumber === episodeNumber) ?? null;

      setDrama(nextDrama);
      setEpisodes(nextEpisodes);
      setEpisode(nextEpisode);
      setPaused(false);
    } catch (e) {
      setError('Could not load this episode. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [dramaId, episodeNumber, token]);

  useEffect(() => {
    load();
  }, [load, unlocksVersion]);

  const currentIndex = episode
    ? episodes.findIndex((ep) => ep.id === episode.id)
    : -1;
  const prevEpisode =
    currentIndex > 0 ? episodes[currentIndex - 1] : undefined;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : undefined;

  const isPlayable = useCallback(
    (ep: Episode) => !ep.isLocked || isUnlocked(ep.id),
    [isUnlocked]
  );

  const goTo = useCallback(
    (ep: Episode) => {
      if (isPlayable(ep)) {
        navigation.setParams({ episodeNumber: ep.episodeNumber });
      } else if (drama) {
        navigation.navigate('Paywall', { episode: ep, drama });
      }
    },
    [drama, isPlayable, navigation]
  );

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double-tap toggles playback (common in vertical players).
      setPaused((p) => !p);
    } else {
      setPaused((p) => !p);
    }
    lastTap.current = now;
  }, []);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    statusRef.current = status;
    if (status.isLoaded && status.didJustFinish) {
      setPaused(true);
    }
  }, []);

  const locked =
    !!episode && episode.isLocked && !isUnlocked(episode.id);
  const hasVideo = !!episode?.videoUrl;

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.brand.red} />
        <Text style={styles.loadingText}>Loading episode...</Text>
      </View>
    );
  }

  if (error || !episode || !drama) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>
          {error ?? 'This episode could not be loaded.'}
        </Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Tap to retry</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video / lock gate */}
      {locked ? (
        <View style={styles.lockedOverlay}>
          <Lock size={56} strokeWidth={1.5} color={Colors.brand.text} />
          <Text style={styles.lockedTitle}>
            Episode {episode.episodeNumber} Locked
          </Text>
          <Text style={styles.lockedSub}>
            Unlock for {episode.coinCost} coins or watch a short ad.
          </Text>
          <Pressable
            style={styles.unlockBtn}
            onPress={() => navigation.navigate('Paywall', { episode, drama })}
          >
            <Key size={16} color={Colors.brand.white} />
            <Text style={styles.unlockBtnText}>Unlock Episode</Text>
          </Pressable>
        </View>
      ) : hasVideo ? (
        <TouchableWithoutFeedback onPress={handleTap} accessible={false}>
          <Video
            ref={videoRef}
            source={{ uri: episode.videoUrl as string }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={!paused}
            isLooping={false}
            isMuted={false}
            onPlaybackStatusUpdate={handlePlaybackStatus}
          />
        </TouchableWithoutFeedback>
      ) : (
        <View style={styles.lockedOverlay}>
          <Text style={styles.lockedTitle}>Episode {episode.episodeNumber}</Text>
          <Text style={styles.lockedSub}>
            This episode is not available on this device yet.
          </Text>
        </View>
      )}

      {!paused && !locked && (
        <Pressable style={[styles.pauseBtn, { top: insets.top + 60 }]} onPress={handleTap}>
          <Pause size={16} color={Colors.brand.text} />
        </Pressable>
      )}

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={Colors.brand.text} />
          </Pressable>
          <View style={styles.topBarInfo}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {drama.title}
            </Text>
            <Text style={styles.topBarSubtitle}>
              Episode {episode.episodeNumber} · {episode.title}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + Spacing.md }]}
        pointerEvents="box-none"
      >
        <View style={styles.bottomInfo}>
          <View style={styles.episodeTitleBlock}>
            <Text style={styles.genre}>{drama.genre}</Text>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              Episode {episode.episodeNumber} — {episode.title}
            </Text>
            <Text style={styles.episodeMeta}>
              {formatDuration(episode.durationSeconds)}
              {locked ? ` · ${episode.coinCost} coins` : ' · unlocked'}
            </Text>
          </View>

          {isUnlocked(episode.id) && !locked && (
            <View style={styles.unlockedBadge}>
              <CheckCircle size={12} color={Colors.ui.success} />
              <Text style={styles.unlockedBadgeText}>Unlocked</Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <Pressable
            style={[styles.controlBtn, !prevEpisode && styles.controlBtnDisabled]}
            disabled={!prevEpisode}
            onPress={() => prevEpisode && goTo(prevEpisode)}
          >
            <SkipBack size={28} color={Colors.brand.text} />
            <Text style={styles.controlLabel}>Prev</Text>
          </Pressable>

          <Pressable
            style={styles.playBtn}
            onPress={() => setPaused((p) => !p)}
            disabled={locked || !hasVideo}
          >
            {paused ? (
              <Play size={30} color={Colors.brand.white} fill={Colors.brand.white} />
            ) : (
              <Pause size={30} color={Colors.brand.white} fill={Colors.brand.white} />
            )}
          </Pressable>

          <Pressable
            style={[styles.controlBtn, !nextEpisode && styles.controlBtnDisabled]}
            disabled={!nextEpisode}
            onPress={() => nextEpisode && goTo(nextEpisode)}
          >
            <SkipForward size={28} color={Colors.brand.text} />
            <Text style={styles.controlLabel}>Next</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.brand.dark,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
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
  },
  retryBtn: {
    backgroundColor: Colors.brand.red,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryBtnText: {
    color: Colors.brand.white,
    fontWeight: Typography.weights.bold,
  },
  backText: {
    color: Colors.brand.red,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.sm,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.brand.dark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  lockedTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  lockedSub: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.red,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
  },
  unlockBtnText: {
    color: Colors.brand.white,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.base,
  },
  pauseBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarInfo: {
    flex: 1,
  },
  topBarTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  topBarSubtitle: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  episodeTitleBlock: {
    flex: 1,
  },
  genre: {
    color: Colors.brand.red,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  episodeTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    lineHeight: 24,
  },
  episodeMeta: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  unlockedBadgeText: {
    color: Colors.ui.success,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  controlLabel: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.brand.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
  },
});
