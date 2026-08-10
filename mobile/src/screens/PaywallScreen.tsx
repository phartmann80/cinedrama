/**
 * PaywallScreen — Episode unlock gate
 *
 * Two unlock paths:
 *   1. Watch a rewarded ad (Google AdMob) → earn coins → auto-unlock  [pending SSV]
 *   2. Spend coins directly (deducted from persisted balance via /user/unlock)
 *
 * Note: AdMob SDK is a placeholder. Install `react-native-google-mobile-ads`
 *       and uncomment the real SDK calls when AdMob SSV is wired server-side.
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../types';

type PaywallRoute = RouteProp<RootStackParamList, 'Paywall'>;

const COIN_REWARD_FROM_AD = 10;

export default function PaywallScreen() {
  const navigation = useNavigation();
  const route = useRoute<PaywallRoute>();
  const { episode, drama } = route.params;
  const { token, coinBalance, unlock, isUnlocked } = useAuth();

  const [loading, setLoading] = useState(false);

  const canAfford = coinBalance >= episode.coinCost;
  const alreadyUnlocked = isUnlocked(episode.id);

  async function handleWatchAd() {
    setLoading(true);
    try {
      // TODO: Replace with real AdMob rewarded ad call (requires AdMob SSV server-side wiring)
      // import MobileAds, { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
      // const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID);
      // rewarded.load();
      // rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, onReward);

      await new Promise((res) => setTimeout(res, 1500));
      Alert.alert(
        '🎉 Coming Soon',
        'Rewarded ad unlock requires AdMob server-side verification.\nPlease use coins to unlock.',
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Ad Error', 'Could not load ad. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSpendCoins() {
    if (!token) {
      Alert.alert(
        'Sign In Required',
        'Create a free account to unlock episodes and track your progress.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!canAfford) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${episode.coinCost} coins but only have ${coinBalance}. Watch an ad to earn more.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await unlock(episode.id);
      if (res.success) {
        Alert.alert('Episode Unlocked! 🎉', `New balance: ${res.newCoinBalance ?? coinBalance} coins.`, [
          { text: 'Watch', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Unlock Failed', res.message ?? 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not unlock episode. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    // TODO: RevenueCat purchase flow
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
        <Text style={styles.lockEmoji}>{alreadyUnlocked ? '🔓' : '🔒'}</Text>

        {/* Episode info */}
        <Text style={styles.dramaTitle}>{drama.title}</Text>
        <Text style={styles.episodeLabel}>
          Episode {episode.episodeNumber} — {episode.title}
        </Text>

        {/* Coin balance */}
        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeText}>
            🪙 Your balance: {token ? coinBalance : 0} coins
          </Text>
        </View>

        {alreadyUnlocked ? (
          <Pressable style={[styles.optionCard, styles.optionCardPrimary]} onPress={() => navigation.goBack()}>
            <Text style={[styles.optionTitle, { textAlign: 'center' }]}>▶ Watch Now</Text>
          </Pressable>
        ) : (
          <>
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
                !token
                  ? 'Sign in to use your coin balance'
                  : canAfford
                  ? 'Use your coin balance to unlock instantly'
                  : `You need ${episode.coinCost - coinBalance} more coins`
              }
              badge={`${episode.coinCost} 🪙`}
              badgeColor={Colors.brand.card}
              onPress={handleSpendCoins}
              loading={loading}
              disabled={!token || !canAfford}
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
          </>
        )}
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
