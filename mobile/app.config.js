// app.config.js extends app.json with dynamic values (env vars, computed fields).
// Expo picks this file over app.json when both are present.
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...appJson.expo.plugins,
      [
        'react-native-google-mobile-ads',
        {
          // Falls back to the AdMob test app ID so the build never crashes in CI.
          androidAppId:
            process.env.EXPO_PUBLIC_ADMOB_APP_ID ??
            'ca-app-pub-3940256099942544~3347511713',
        },
      ],
    ],
  },
};
