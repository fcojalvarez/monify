import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.monify.app',
  appName: 'Monify',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
