/**
 * FeedScreen — Vertical swipe feed (TikTok/Reels style)
 *
 * Architecture:
 *  - FlatList with pagingEnabled + snapToInterval = full screen height
 *  - Each page renders a <VideoCard> with the episode's video
 *  - Visible item tracked via onViewableItemsChanged → only the current
 *    card plays, all others are paused (reduces memory + CPU)
 *  - Double-tap to like, tap to pause/resume
 */

import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import VideoCard from '../components/VideoCard';
import { fetchDramas, fetchEpisodes } from '../api/client';
import type { Episode, Drama } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedItem {
  episode: Episode;
  drama: Drama;
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({
    itemVisibilityPercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    try {
      setLoading(true);
      const dramas = await fetchDramas();
      const feedItems: FeedItem[] = [];
      // Interleave episodes from multiple dramas
      const episodeBatches = await Promise.all(
        dramas.slice(0, 4).map((d) =>
          fetchEpisodes(d.id).then((eps) =>
            eps.map((ep) => ({ episode: ep, drama: d }))
          )
        )
      );
      // Round-robin interleave
      const maxLen = Math.max(...episodeBatches.map((b) => b.length));
      for (let i = 0; i < maxLen; i++) {
        for (const batch of episodeBatches) {
          if (batch[i]) feedItems.push(batch[i]);
        }
      }
      setItems(feedItems);
    } catch (e) {
      setError('Could not load feed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <VideoCard
        episode={item.episode}
        drama={item.drama}
        isActive={index === activeIndex}
        height={SCREEN_HEIGHT}
      />
    ),
    [activeIndex]
  );

  const keyExtractor = useCallback(
    (item: FeedItem) => `${item.drama.id}-${item.episode.id}`,
    []
  );

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.brand.red} />
        <Text style={styles.loadingText}>Loading your feed…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={loadFeed}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // Pre-render 2 items above/below for smooth swipe
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.brand.muted,
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: Colors.brand.text,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryText: {
    color: Colors.brand.red,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
