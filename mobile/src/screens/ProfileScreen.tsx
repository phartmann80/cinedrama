import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Film, LockOpen, Lock, Heart, Key, FileText, Mail, X } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { token, email, coinBalance, unlockedEpisodeIds, register, login, logout, isLoading } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!emailInput.trim() || !passwordInput.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(emailInput.trim(), passwordInput);
      } else {
        await register(emailInput.trim(), passwordInput);
      }
      setModalVisible(false);
      setEmailInput('');
      setPasswordInput('');
    } catch (err: any) {
      Alert.alert(mode === 'login' ? 'Login Failed' : 'Registration Failed', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>My Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <User size={36} strokeWidth={1.75} color={Colors.brand.muted} />
          </View>
          {token ? (
            <>
              <Text style={styles.displayName}>{email}</Text>
              <Pressable onPress={handleLogout}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.displayName}>Guest User</Text>
              <Text style={styles.emailText}>Sign in to save your progress</Text>
              <Pressable
                style={styles.signInBtn}
                onPress={() => { setMode('login'); setModalVisible(true); }}
              >
                <Text style={styles.signInBtnText}>Sign In / Register</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Coin balance */}
        <View style={styles.coinCard}>
          <Text style={styles.coinLabel}>Coin Balance</Text>
          <View style={styles.coinRow}>
            <Key size={24} strokeWidth={1.75} color={Colors.brand.text} />
            <Text style={styles.coinAmount}>{token ? coinBalance : 0} coins</Text>
          </View>
          {token && unlockedEpisodeIds.length > 0 && (
            <Text style={styles.unlockedText}>{unlockedEpisodeIds.length} episodes unlocked</Text>
          )}
          <Pressable style={styles.earnBtn}>
            <Text style={styles.earnBtnText}>Watch Ads to Earn</Text>
          </Pressable>
        </View>

        {/* Menu items */}
        {[
          { icon: <Film size={20} strokeWidth={1.75} color={Colors.brand.text} />, label: 'My Watchlist' },
          { icon: <Heart size={20} strokeWidth={1.75} color={Colors.brand.text} />, label: 'Liked Episodes' },
          { icon: <LockOpen size={20} strokeWidth={1.75} color={Colors.brand.text} />, label: 'Unlocked Episodes' },
          { icon: <Lock size={20} strokeWidth={1.75} color={Colors.brand.text} />, label: 'Subscribe for Unlimited' },
          { icon: <FileText size={20} strokeWidth={1.75} color={Colors.brand.text} />, label: 'Privacy Policy' },
          { icon: <FileText size={20} strokeWidth={1.75} color={Colors.brand.text} />, label: 'Terms of Service' },
          { icon: <Mail size={20} strokeWidth={1.75} color={Colors.brand.text} />, label: 'Contact Support' },
        ].map((item) => (
          <Pressable key={item.label} style={styles.menuItem}>
            <View style={styles.menuIcon}>{item.icon}</View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuChevron}>{'>'}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Auth modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={18} strokeWidth={1.75} color={Colors.brand.muted} />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.brand.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={emailInput}
              onChangeText={setEmailInput}
            />
            <TextInput
              style={styles.input}
              placeholder={mode === 'register' ? 'Password (8+ characters)' : 'Password'}
              placeholderTextColor={Colors.brand.muted}
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
            />

            <Pressable
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.brand.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              style={styles.switchMode}
            >
              <Text style={styles.switchModeText}>
                {mode === 'login'
                  ? "Don't have an account? Register"
                  : 'Already have an account? Sign In'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  displayName: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  emailText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
  },
  signOutText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  signInBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.brand.red,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  signInBtnText: {
    color: Colors.brand.white,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.base,
  },
  coinCard: {
    backgroundColor: Colors.brand.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  coinLabel: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinAmount: {
    color: Colors.brand.text,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
  },
  unlockedText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.sm,
  },
  earnBtn: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.brand.red,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  earnBtnText: {
    color: Colors.brand.red,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.border,
  },
  menuIcon: {
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
  },
  menuChevron: {
    color: Colors.brand.muted,
    fontSize: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalSheet: {
    backgroundColor: Colors.brand.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    color: Colors.brand.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
  },
  input: {
    backgroundColor: Colors.brand.dark,
    borderWidth: 1,
    borderColor: Colors.brand.border,
    borderRadius: BorderRadius.lg,
    color: Colors.brand.text,
    fontSize: Typography.sizes.base,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  submitBtn: {
    backgroundColor: Colors.brand.red,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  submitBtnText: {
    color: Colors.brand.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  switchMode: {
    alignItems: 'center',
  },
  switchModeText: {
    color: Colors.brand.muted,
    fontSize: Typography.sizes.sm,
    textDecorationLine: 'underline',
  },
});
