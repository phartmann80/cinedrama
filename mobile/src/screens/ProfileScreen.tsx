import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>My Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.displayName}>Guest User</Text>
          <Text style={styles.email}>Sign in to save progress</Text>
        </View>

        {/* Coin balance */}
        <View style={styles.coinCard}>
          <Text style={styles.coinLabel}>Coin Balance</Text>
          <Text style={styles.coinAmount}>🪙 0 coins</Text>
          <Pressable style={styles.earnBtn}>
            <Text style={styles.earnBtnText}>Watch Ads to Earn</Text>
          </Pressable>
        </View>

        {/* Menu items */}
        {[
          { emoji: '🎬', label: 'My Watchlist' },
          { emoji: '❤️', label: 'Liked Episodes' },
          { emoji: '🔓', label: 'Unlocked Episodes' },
          { emoji: '💎', label: 'Subscribe for Unlimited' },
          { emoji: '🔒', label: 'Privacy Policy' },
          { emoji: '📋', label: 'Terms of Service' },
          { emoji: '✉️', label: 'Contact Support' },
        ].map((item) => (
          <Pressable key={item.label} style={styles.menuItem}>
            <Text style={styles.menuEmoji}>{item.emoji}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.dark,
    paddingHorizontal: Spacing.md,
  },
  heading: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    paddingVertical: Spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brand.card,
    borderWidth: 2,
    borderColor: Colors.brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 36,
  },
  displayName: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  email: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
  },
  coinCard: {
    backgroundColor: 'rgba(232,0,61,0.08)',
    borderWidth: 1,
    borderColor: Colors.brand.red,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  coinLabel: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  coinAmount: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    marginBottom: Spacing.sm,
  },
  earnBtn: {
    backgroundColor: Colors.brand.red,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  earnBtnText: {
    color: Colors.brand.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border,
    gap: Spacing.sm,
  },
  menuEmoji: {
    fontSize: 20,
    width: 28,
  },
  menuLabel: {
    flex: 1,
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  menuChevron: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xl,
  },
});
