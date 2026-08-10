import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MobileAds from 'react-native-google-mobile-ads';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

export default function App() {
  useEffect(() => {
    // Initialise Google Mobile Ads SDK once on launch.
    MobileAds()
      .initialize()
      .catch((err) => console.warn('[AdMob] init error:', err));

    // Configure RevenueCat.  Set log level to DEBUG in dev only.
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    if (REVENUECAT_API_KEY) {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    } else {
      console.warn('[RevenueCat] EXPO_PUBLIC_REVENUECAT_API_KEY is not set.');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
