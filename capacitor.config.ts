import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toolapp.collection',
  appName: '工具集',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: ['111.229.151.210'],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    path: 'android',
  },
};

export default config;
