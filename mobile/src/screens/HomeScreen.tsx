import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { fetchDramas } from '../api/client';
import type { Drama, RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const GENRES = ['All', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 'Action'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState('All');

  useEffect(() => {
    fetchDramas()
      .then(setDramas)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeGenre === 'All'
      ? dramas
      : dramas.filter((d) => d.genre.includes(activeGenre));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoText}>
              Cine<Text style={styles.logoRed}>Drama</Text>
            </Text>
            <Text style={styles.tagline}>Cinematic stories in 2 minutes</Text>
          </View>
          <Pressable style={styles.coinBadge}>
            <Text style={styles.coinText}>🪙 0</Text>
          </Pressable>
        </View>

        {/* Genre filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreTabs}
        >
          {GENRES.map((g) => (
            <Pressable
              key={g}
              onPress={() => setActiveGenre(g)}
              style={[
                styles.genreTab,
                activeGenre === g && styles.genreTabActive,
              ]}
            >
              <Text
                style={[
                  styles.genreTabText,
                  activeGenre === g && styles.genreTabTextActive,
                ]}
              >
                {g}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Series grid */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.brand.red} />
          </View>
        ) : (
          <>
            <SectionHeader title="Trending Now" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {filtered.slice(0, 6).map((drama) => (
                <DramaCard
                  key={drama.id}
                  drama={drama}
                  onPress={() =>
                    navigation.navigate('Feed', { dramaId: drama.id })
                  }
                />
              ))}
            </ScrollView>

            <SectionHeader title="New This Week" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {filtered
                .filter((d) => d.isNew)
                .slice(0, 6)
                .map((drama) => (
                  <DramaCard
                    key={drama.id}
                    drama={drama}
                    onPress={() =>
                      navigation.navigate('Feed', { dramaId: drama.id })
                    }
                  />
                ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function DramaCard({ drama, onPress }: { drama: Drama; onPress: () => void }) {
  return (
    <Pressable style={styles.dramaCard} onPress={onPress}>
      <View style={styles.dramaPoster}>
        <Text style={styles.dramaInitial}>
          {drama.title.charAt(0)}
        </Text>
        {drama.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <Text style={styles.dramaCardTitle} numberOfLines={2}>
        {drama.title}
      </Text>
      <Text style={styles.dramaCardGenre}>{drama.genre}</Text>
      <Text style={styles.dramaCardEps}>{drama.totalEpisodes} episodes</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  logoText: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
  },
  logoRed: {
    color: Colors.brand.red,
  },
  tagline: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  coinBadge: {
    backgroundColor: Colors.brand.card,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  coinText: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  genreTabs: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  genreTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  genreTabActive: {
    backgroundColor: Colors.brand.red,
    borderColor: Colors.brand.red,
  },
  genreTabText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  genreTabTextActive: {
    color: Colors.brand.white,
    fontWeight: Typography.weights.bold,
  },
  center: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  horizontalList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  dramaCard: {
    width: 140,
  },
  dramaPoster: {
    width: 140,
    height: 210,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.brand.card,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  dramaInitial: {
    fontSize: 56,
    color: Colors.brand.red,
    fontWeight: Typography.weights.extrabold,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.brand.red,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: Colors.brand.white,
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  dramaCardTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    lineHeight: 18,
    marginBottom: 2,
  },
  dramaCardGenre: {
    color: Colors.brand.red,
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  dramaCardEps: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
  },
});
