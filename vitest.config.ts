import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./tests/setup.ts'],
      // Variables de entorno para los tests (evita fallos de config/env.ts)
      env: {
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_AUTH_REDIRECT_URL: 'http://localhost:5173/auth/callback',
        VITE_APP_NAME: 'Monify',
        VITE_DEFAULT_CURRENCY: 'EUR',
        VITE_DEFAULT_LOCALE: 'es-ES',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/*.spec.ts', 'src/types/**', 'src/main.ts'],
      },
    },
  }),
)
