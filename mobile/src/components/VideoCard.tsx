/**
 * VideoCard — Full-screen episode player card
 *
 * Features:
 *  - Auto-play when isActive, pause otherwise
 *  - Tap to pause / resume
 *  - Double-tap to like (heart animation)
 *  - Paywall gate on locked episodes (launches PaywallScreen as modal)
 *  - Overlay with drama/episode info, like/share/comment actions
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '../constants/theme';
import type { Episode, Drama, RootStackParamList } from '../types';

// react-native-video  (installed as a dep)
// For Expo managed workflow use expo-av instead:
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;

interface Props {
  episode: Episode;
  drama: Drama;
  isActive: boolean;
  height: number;
}

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Feed'>;

export default function VideoCard({ episode, drama, isActive, height }: Props) {
  const navigation = useNavigation<NavProp>();
  const videoRef = useRef<Video>(null);

  const [paused, setPaused] = useState(!isActive);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 9000) + 100);

  // Double-tap state
  const lastTap = useRef<number | null>(null);
  const heartAnim = useRef(new Animated.Value(0)).current;

  // Sync play/pause with active state
  useEffect(() => {
    if (!isActive) {
      setPaused(true);
    }
    // Don't auto-resume if user manually paused
  }, [isActive]);

  // If episode is locked and user tries to watch, open paywall
  const handleLockedEpisode = useCallback(() => {
    navigation.navigate('Paywall', { episode, drama });
  }, [navigation, episode, drama]);

  const handleSingleTap = useCallback(() => {
    if (episode.isLocked) {
      handleLockedEpisode();
      return;
    }
    setPaused((prev) => !prev);
  }, [episode.isLocked, handleLockedEpisode]);

  const animateHeart = useCallback(() => {
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 12,
      }),
      Animated.delay(600),
      Animated.timing(heartAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heartAnim]);

  const handleDoubleTap = useCallback(() => {
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
    animateHeart();
  }, [liked, animateHeart]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = null;
      handleDoubleTap();
    } else {
      lastTap.current = now;
      setTimeout(() => {
        // Only fire single tap if no second tap came
        if (lastTap.current === now) {
          lastTap.current = null;
          handleSingleTap();
        }
      }, DOUBLE_TAP_DELAY);
    }
  }, [handleDoubleTap, handleSingleTap]);

  const heartScale = heartAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.4, 1],
  });
  const heartOpacity = heartAnim;

  // Show the thumbnail as a placeholder when: (a) episode is locked, or
  // (b) unlocked but the signed URL hasn't arrived yet (re-fetch in progress).
  const showVideoPlaceholder = episode.isLocked || !episode.videoUrl;
  const videoSource = { uri: episode.videoUrl ?? episode.thumbnailUrl };

  return (
    <TouchableWithoutFeedback onPress={handleTap} accessible={false}>
      <View style={[styles.container, { height }]}>
        {/* Video / Locked Thumbnail */}
        {showVideoPlaceholder ? (
          <View style={styles.lockedOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockedTitle}>Episode {episode.episodeNumber} Locked</Text>
            <Text style={styles.lockedSub}>Watch an ad or spend {episode.coinCost} coins to unlock</Text>
            <Pressable style={styles.unlockBtn} onPress={handleLockedEpisode}>
              <Text style={styles.unlockBtnText}>Unlock Episode</Text>
            </Pressable>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={videoSource}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && !paused}
            isLooping
            isMuted={false}
          />
        )}

        {/* Bottom gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
          pointerEvents="none"
        />

        {/* Episode / drama info */}
        <View style={styles.infoContainer} pointerEvents="none">
          <Text style={styles.genreTag}>{drama.genre}</Text>
          <Text style={styles.dramaTitle}>{drama.title}</Text>
          <Text style={styles.episodeLabel}>
            Episode {episode.episodeNumber} · {formatDuration(episode.durationSeconds)}
          </Text>
          <Text style={styles.episodeTitle} numberOfLines={2}>
            {episode.title}
          </Text>
        </View>

        {/* Right-side action bar */}
        <View style={styles.actionBar} pointerEvents="box-none">
          {/* Like */}
          <ActionButton
            emoji={liked ? '❤️' : '🤍'}
            label={formatCount(likeCount)}
            onPress={() => {
              setLiked((l) => !l);
              setLikeCount((c) => (liked ? c - 1 : c + 1));
            }}
          />

          {/* Share */}
          <ActionButton
            emoji="↗️"
            label="Share"
            onPress={() => Alert.alert('Share', 'Share link copied!')}
          />

          {/* Coin unlock */}
          {episode.isLocked && (
            <ActionButton
              emoji="🪙"
              label={`${episode.coinCost}`}
              onPress={handleLockedEpisode}
            />
          )}
        </View>

        {/* Double-tap heart animation */}
        <Animated.Text
          style={[
            styles.heartBurst,
            {
              opacity: heartOpacity,
              transform: [{ scale: heartScale }],
            },
          ]}
          pointerEvents="none"
        >
          ❤️
        </Animated.Text>

        {/* Pause indicator */}
        {paused && !episode.isLocked && (
          <View style={styles.pauseIndicator} pointerEvents="none">
            <Text style={styles.pauseIcon}>⏸</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

function ActionButton({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: Colors.brand.dark,
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 80,
    left: Spacing.md,
    right: 80,
  },
  genreTag: {
    color: Colors.brand.red,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  dramaTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    marginBottom: 4,
  },
  episodeLabel: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  episodeTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  actionBar: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: 100,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionLabel: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  heartBurst: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    fontSize: 80,
  },
  pauseIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIcon: {
    fontSize: 48,
    opacity: 0.6,
  },
  // Locked state
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  lockedTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  lockedSub: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  unlockBtn: {
    backgroundColor: Colors.brand.red,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 50,
  },
  unlockBtnText: {
    color: Colors.brand.white,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.base,
  },
});
