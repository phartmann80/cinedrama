/**
 * PaywallScreen — Episode unlock gate
 *
 * Two unlock paths:
 *   1. Watch a rewarded ad (Google AdMob) → earn coins → auto-unlock
 *   2. Spend coins directly (RevenueCat / coin balance)
 *
 * Note: AdMob and RevenueCat SDKs are referenced as placeholders below.
 *       Install `react-native-google-mobile-ads` and `react-native-purchases`
 *       then uncomment the real SDK calls.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { RootStackParamList } from '../types';

type PaywallRoute = RouteProp<RootStackParamList, 'Paywall'>;

const COIN_REWARD_FROM_AD = 10; // coins earned per rewarded ad

export default function PaywallScreen() {
  const navigation = useNavigation();
  const route = useRoute<PaywallRoute>();
  const { episode, drama } = route.params;

  const [loading, setLoading] = useState(false);
  const [userCoins] = useState(0); // TODO: pull from auth context

  const canAfford = userCoins >= episode.coinCost;

  async function handleWatchAd() {
    setLoading(true);
    try {
      // TODO: Replace with real AdMob rewarded ad call
      // import MobileAds, { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
      // const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID);
      // rewarded.load();
      // rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, onReward);

      // Simulate ad completion
      await new Promise((res) => setTimeout(res, 1500));
      Alert.alert(
        '🎉 Coins Earned!',
        `You earned ${COIN_REWARD_FROM_AD} coins for watching the ad. Episode unlocked!`,
        [{ text: 'Watch Now', onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert('Ad Error', 'Could not load ad. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSpendCoins() {
    if (!canAfford) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${episode.coinCost} coins but only have ${userCoins}. Watch an ad to earn more.`
      );
      return;
    }
    setLoading(true);
    try {
      // TODO: call unlockEpisode({ episodeId: episode.id, method: 'coins' }, token)
      await new Promise((res) => setTimeout(res, 800));
      Alert.alert('Episode Unlocked!', 'Enjoy the episode.', [
        { text: 'Watch', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not unlock episode. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    // TODO: RevenueCat purchase flow
    // import Purchases from 'react-native-purchases';
    // const offerings = await Purchases.getOfferings();
    // await Purchases.purchasePackage(package);
    Alert.alert('Subscribe', 'Subscription flow coming soon via RevenueCat.');
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(232,0,61,0.15)', Colors.brand.dark]}
        style={StyleSheet.absoluteFill}
      />

      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Lock icon */}
        <Text style={styles.lockEmoji}>🔒</Text>

        {/* Episode info */}
        <Text style={styles.dramaTitle}>{drama.title}</Text>
        <Text style={styles.episodeLabel}>
          Episode {episode.episodeNumber} — {episode.title}
        </Text>

        {/* Coin balance */}
        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeText}>🪙 Your balance: {userCoins} coins</Text>
        </View>

        <Text style={styles.sectionLabel}>Choose how to unlock</Text>

        {/* Option 1: Watch ad */}
        <OptionCard
          title="Watch a Short Ad"
          subtitle={`Earn ${COIN_REWARD_FROM_AD} coins → auto-unlocks this episode`}
          badge="FREE"
          badgeColor={Colors.ui.success}
          onPress={handleWatchAd}
          loading={loading}
          primary
        />

        {/* Option 2: Spend coins */}
        <OptionCard
          title={`Spend ${episode.coinCost} Coins`}
          subtitle={
            canAfford
              ? 'Use your coin balance to unlock instantly'
              : `You need ${episode.coinCost - userCoins} more coins`
          }
          badge={`${episode.coinCost} 🪙`}
          badgeColor={Colors.brand.card}
          onPress={handleSpendCoins}
          loading={loading}
          disabled={!canAfford}
        />

        {/* Option 3: Subscribe */}
        <Pressable style={styles.subscribeBtn} onPress={handleSubscribe}>
          <Text style={styles.subscribeBtnText}>
            💎 Unlimited Access — Subscribe
          </Text>
          <Text style={styles.subscribeSubText}>
            Unlock all episodes forever
          </Text>
        </Pressable>

        <Text style={styles.legal}>
          By subscribing, you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </View>
  );
}

function OptionCard({
  title,
  subtitle,
  badge,
  badgeColor,
  onPress,
  loading,
  primary,
  disabled,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  onPress: () => void;
  loading?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.optionCard,
        primary && styles.optionCardPrimary,
        disabled && styles.optionCardDisabled,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <View style={styles.optionCardInner}>
        <View style={styles.optionText}>
          <Text
            style={[
              styles.optionTitle,
              disabled && { color: Colors.brand.muted },
            ]}
          >
            {title}
          </Text>
          <Text style={styles.optionSubtitle}>{subtitle}</Text>
        </View>
        <View
          style={[styles.optionBadge, { backgroundColor: badgeColor }]}
        >
          <Text style={styles.optionBadgeText}>{badge}</Text>
        </View>
      </View>
      {loading && primary && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={Colors.brand.white}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: Spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  closeBtnText: {
    color: Colors.brand.text,
    fontSize: 14,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: 100,
    alignItems: 'center',
  },
  lockEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  dramaTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: 6,
  },
  episodeLabel: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  coinBadge: {
    backgroundColor: Colors.brand.card,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  coinBadgeText: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  sectionLabel: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  optionCard: {
    width: '100%',
    backgroundColor: Colors.brand.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  optionCardPrimary: {
    borderColor: Colors.brand.red,
    backgroundColor: 'rgba(232,0,61,0.08)',
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  optionSubtitle: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  optionBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  optionBadgeText: {
    color: Colors.brand.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  subscribeBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.brand.red,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  subscribeBtnText: {
    color: Colors.brand.red,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.base,
  },
  subscribeSubText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  legal: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.brand.red,
    textDecorationLine: 'underline',
  },
});
