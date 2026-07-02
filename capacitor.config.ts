import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ikfinance.app',
  appName: 'IK Finance',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // During development you can point to your local dev server:
    // url: 'http://192.168.1.X:5173',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    backgroundColor: '#030712',
  },
  ios: {
    backgroundColor: '#030712',
    contentInset: 'always',
    scrollEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#030712',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#030712',
    },
  },
};

export default config;
