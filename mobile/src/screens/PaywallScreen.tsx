/**
 * PaywallScreen - Episode unlock gate
 *
 * Two unlock paths:
 *   1. Watch a rewarded ad (Google AdMob) -> earn coins -> auto-unlock
 *      Uses react-native-google-mobile-ads with Server-Side Verification (SSV).
 *      On EARNED_REWARD the app calls POST /api/v1/user/unlock with method:'ad'.
 *   2. Spend coins directly (deducted from persisted balance via /user/unlock)
 *   3. Subscribe via RevenueCat for unlimited access.
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
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';
import Purchases from 'react-native-purchases';
import { Lock, LockOpen, CheckCircle, Key, X, Play } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../types';

type PaywallRoute = RouteProp<RootStackParamList, 'Paywall'>;

const COIN_REWARD_FROM_AD = 10;

/** Use test ad unit in development, real unit in production builds. */
const AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT ?? TestIds.REWARDED);

export default function PaywallScreen() {
  const navigation = useNavigation();
  const route = useRoute<PaywallRoute>();
  const { episode, drama } = route.params;
  const { token, userId, coinBalance, unlock, isUnlocked } = useAuth();

  const [loading, setLoading] = useState(false);

  const canAfford = coinBalance >= episode.coinCost;
  const alreadyUnlocked = isUnlocked(episode.id);

  // -- Watch ad --

  async function handleWatchAd() {
    if (!token) {
      Alert.alert(
        'Sign In Required',
        'Create a free account to watch ads and earn coins.',
        [{ text: 'OK' }],
      );
      return;
    }

    setLoading(true);

    try {
      const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID, {
        // SSV options let the backend attribute the reward to this user.
        serverSideVerificationOptions: {
          userId: userId ?? undefined,
          customData: episode.id,
        },
      });

      let rewardEarned = false;

      await new Promise<void>((resolve, reject) => {
        const unsubError = rewarded.addAdEventListener(
          AdEventType.ERROR,
          (error) => {
            cleanup();
            reject(error);
          },
        );

        const unsubLoaded = rewarded.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            rewarded.show();
          },
        );

        const unsubEarned = rewarded.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          () => {
            rewardEarned = true;
          },
        );

        const unsubClosed = rewarded.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            cleanup();
            resolve();
          },
        );

        function cleanup() {
          unsubError();
          unsubLoaded();
          unsubEarned();
          unsubClosed();
        }

        rewarded.load();
      });

      if (rewardEarned) {
        // Tell the server the user earned a reward - it credits coins and
        // unlocks the episode atomically.
        const res = await unlock(episode.id, 'ad');
        if (res.success) {
          Alert.alert(
            'Episode Unlocked!',
            `You earned ${COIN_REWARD_FROM_AD} coins!\nNew balance: ${res.newCoinBalance ?? coinBalance} coins.`,
            [{ text: 'Watch', onPress: () => navigation.goBack() }],
          );
        } else {
          Alert.alert('Unlock Failed', res.message ?? 'Please try again.');
        }
      }
      // else: user closed the ad before completing it - no reward, no error.
    } catch (err: any) {
      Alert.alert(
        'Ad Error',
        err?.message ?? 'Could not load ad. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  // -- Spend coins --

  async function handleSpendCoins() {
    if (!token) {
      Alert.alert(
        'Sign In Required',
        'Create a free account to unlock episodes and track your progress.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (!canAfford) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${episode.coinCost} coins but only have ${coinBalance}. Watch an ad to earn more.`,
      );
      return;
    }

    setLoading(true);
    try {
      const res = await unlock(episode.id, 'coins');
      if (res.success) {
        Alert.alert(
          'Episode Unlocked!',
          `New balance: ${res.newCoinBalance ?? coinBalance} coins.`,
          [{ text: 'Watch', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert('Unlock Failed', res.message ?? 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not unlock episode. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // -- Subscribe --

  async function handleSubscribe() {
    setLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      const offering = offerings.current;

      if (!offering || offering.availablePackages.length === 0) {
        Alert.alert(
          'No Offerings',
          'Subscription plans are not available right now. Please try again later.',
        );
        return;
      }

      // Present the first (typically only) package - RevenueCat handles the
      // native purchase sheet including trial info and pricing.
      const pkg = offering.availablePackages[0];
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      const isActive =
        typeof customerInfo.entitlements.active['premium'] !== 'undefined';

      if (isActive) {
        Alert.alert(
          'Subscription Active!',
          'You now have unlimited access to all episodes.',
          [{ text: 'Watch', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err: any) {
      // RevenueCat throws with code 1 when the user cancels - swallow that.
      if (err?.code !== '1' && err?.userCancelled !== true) {
        Alert.alert('Purchase Error', err?.message ?? 'Could not complete purchase. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // -- Render --

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(232,0,61,0.15)', Colors.brand.dark]}
        style={StyleSheet.absoluteFill}
      />

      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <X size={14} strokeWidth={1.75} color={Colors.brand.text} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Lock icon */}
        <View style={styles.lockIconContainer}>
          {alreadyUnlocked ? (
            <LockOpen size={56} strokeWidth={1.5} color={Colors.brand.text} />
          ) : (
            <Lock size={56} strokeWidth={1.5} color={Colors.brand.text} />
          )}
        </View>

        {/* Episode info */}
        <Text style={styles.dramaTitle}>{drama.title}</Text>
        <Text style={styles.episodeLabel}>
          Episode {episode.episodeNumber} - {episode.title}
        </Text>

        {/* Coin balance */}
        <View style={styles.coinBadge}>
          <View style={styles.coinBadgeRow}>
            <Key size={14} strokeWidth={1.75} color={Colors.brand.text} />
            <Text style={styles.coinBadgeText}>
              Your balance: {token ? coinBalance : 0} coins
            </Text>
          </View>
        </View>

        {alreadyUnlocked ? (
          <Pressable
            style={[styles.optionCard, styles.optionCardPrimary]}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.watchNowRow}>
              <Play size={16} strokeWidth={1.75} color={Colors.brand.text} fill={Colors.brand.text} />
              <Text style={[styles.optionTitle, { textAlign: 'center' }]}>
                Watch Now
              </Text>
            </View>
          </Pressable>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Choose how to unlock</Text>

            {/* Option 1: Watch ad */}
            <OptionCard
              title="Watch a Short Ad"
              subtitle={`Earn ${COIN_REWARD_FROM_AD} coins -> auto-unlocks this episode`}
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
              badge={`${episode.coinCost} coins`}
              badgeColor={Colors.brand.card}
              onPress={handleSpendCoins}
              loading={loading}
              disabled={!token || !canAfford}
            />

            {/* Option 3: Subscribe */}
            <Pressable
              style={[styles.subscribeBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              <View style={styles.subscribeRow}>
                <CheckCircle size={16} strokeWidth={1.75} color={Colors.brand.red} />
                <Text style={styles.subscribeBtnText}>
                  Unlimited Access - Subscribe
                </Text>
              </View>
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
        <View style={[styles.optionBadge, { backgroundColor: badgeColor }]}>
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
  content: {
    padding: Spacing.xl,
    paddingTop: 100,
    alignItems: 'center',
  },
  lockIconContainer: {
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
  coinBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  watchNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  subscribeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
