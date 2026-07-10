import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ecosmartexam.app',
  appName: 'Eco Smart Exam',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
