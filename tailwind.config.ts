import type { Config } from 'tailwindcss'

/**
 * Sistema de diseño de Monify.
 *
 * - Los colores de MARCA (primary / secondary / tertiary) y semánticos (income / expense…)
 *   viven aquí como escalas estáticas → soportan modificadores de opacidad (bg-primary-500/20).
 * - Los tokens de SUPERFICIE (fondo, tarjetas, texto, bordes) se definen como CSS custom
 *   properties en `src/assets/styles/main.css` y cambian con el modo claro/oscuro.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Primary · Monify Mint (dinero, crecimiento, frescura) ──
        primary: {
          50: '#e6fbf5',
          100: '#c4f5e6',
          200: '#8eebce',
          300: '#52dcb1',
          400: '#24c898',
          500: '#00b894', // ← color de marca
          600: '#009c7f',
          700: '#007d67',
          800: '#066451',
          900: '#0a5243',
          950: '#04322a',
        },
        // ── Secondary · Deep Indigo (confianza, texto, navegación) ──
        secondary: {
          50: '#eef1fb',
          100: '#d7ddf5',
          200: '#b0bce9',
          300: '#8194da',
          400: '#566fc5',
          500: '#3a53a8',
          600: '#2d4189',
          700: '#26356c',
          800: '#1f2a54',
          900: '#161d3b',
          950: '#0c1024',
        },
        // ── Tertiary · Warm Coral (acentos, gastos, alertas suaves) ──
        tertiary: {
          50: '#fff1ee',
          100: '#ffddd6',
          200: '#ffbcae',
          300: '#ff9179',
          400: '#ff6b4d',
          500: '#f5492a',
          600: '#e0341c',
          700: '#ba2718',
          800: '#99251a',
          900: '#7e241b',
          950: '#450d08',
        },
        // ── Semánticos ──
        income: {
          light: '#e6fbf5',
          DEFAULT: '#00b894',
          dark: '#007d67',
        },
        expense: {
          light: '#fff1ee',
          DEFAULT: '#f5492a',
          dark: '#ba2718',
        },
        success: '#00b894',
        warning: '#f6a609',
        danger: '#e0341c',
        info: '#3a53a8',

        // ── Superficies (via CSS vars → dark mode) ──
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
          raised: 'var(--surface-raised)',
        },
        content: {
          DEFAULT: 'var(--content)',
          muted: 'var(--content-muted)',
          subtle: 'var(--content-subtle)',
          inverted: 'var(--content-inverted)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
      },
      fontFamily: {
        sans: [
          'Inter var',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['Cal Sans', 'Inter var', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // escala tipográfica con line-height acoplado
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        display: ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        // Radios generosos → aspecto de app nativa
        card: '1.25rem', // 20px
        field: '0.875rem', // 14px
        pill: '9999px',
      },
      boxShadow: {
        // Sombras suaves y con tinte, no negro puro
        xs: '0 1px 2px 0 rgba(22, 29, 59, 0.04)',
        sm: '0 1px 3px 0 rgba(22, 29, 59, 0.08), 0 1px 2px -1px rgba(22, 29, 59, 0.06)',
        card: '0 8px 24px -8px rgba(22, 29, 59, 0.12), 0 2px 6px -2px rgba(22, 29, 59, 0.06)',
        raised: '0 16px 40px -12px rgba(22, 29, 59, 0.20)',
        'primary-glow': '0 8px 24px -6px rgba(0, 184, 148, 0.45)',
        focus: '0 0 0 3px rgba(0, 184, 148, 0.28)',
      },
      spacing: {
        // safe-area para notch / Capacitor
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config
