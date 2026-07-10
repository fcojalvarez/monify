# 💚 Monify

Control de **gastos e ingresos**, personal y familiar. App web (hoy) preparada para empaquetarse con **Capacitor** (mañana) sin reescribir la lógica.

## Stack

| Área        | Tecnología                                              |
| ----------- | ------------------------------------------------------- |
| UI          | Vue 3 (`<script setup>` + Composition API) · TypeScript |
| Estado      | Pinia (setup stores)                                    |
| Rutas       | Vue Router 4 + guard de sesión                          |
| Estilos     | TailwindCSS + sistema de diseño propio                  |
| Animaciones | View Transitions API (aspecto nativo)                   |
| Build       | Vite                                                    |
| Backend     | Supabase (Auth + Postgres + RLS)                        |
| Iconos      | Iconify (`@iconify/vue`) → cualquier icono              |
| Tests       | Vitest + @vue/test-utils                                |

## Puesta en marcha

```bash
pnpm install          # instala dependencias
cp .env.example .env  # y rellena tus credenciales de Supabase
pnpm dev              # arranca en http://localhost:5173
```

### Configurar Supabase

4. (Opcional) En Authentication → URL Configuration añade la `VITE_AUTH_REDIRECT_URL`
   como Redirect URL para la confirmación de email y el reset de contraseña.

> Con el CLI de Supabase enlazado puedes regenerar los tipos: `pnpm db:types`.

## Scripts

```bash
pnpm dev            # desarrollo
pnpm build          # type-check + build de producción
pnpm preview        # sirve el build
pnpm test           # tests en watch
pnpm test:run       # tests una vez (CI)
pnpm test:coverage  # cobertura
pnpm lint           # eslint --fix
pnpm format         # prettier
```

## Arquitectura

```
src/
├── assets/styles/     main.css (tokens + Tailwind) · transitions.css
├── components/
│   ├── ui/            sistema de diseño (BaseButton, BaseInput, BaseSelect,
│   │                  BaseSheet, SegmentedControl, IconPicker, ColorPicker, AppIcon…)
│   ├── layout/        AppHeader…
│   ├── dashboard/     BalanceSummary, CategoryProgress
│   ├── transactions/  TransactionItem, TransactionForm
│   ├── categories/    CategoryForm, CategoryManager (icono libre + límite)
│   └── family/        FamilyForm, FamilyManager (n personas por cuenta)
├── composables/       useViewTransition · usePlatform (Capacitor-ready)
├── config/            env.ts (acceso validado a variables de entorno)
├── constants/         nombres de ruta, paletas, iconos sugeridos
├── lib/               supabase.ts (cliente tipado)
├── router/            index.ts + guards.ts (guard de sesión JWT)
├── services/          acceso a Supabase, aislado de los stores
├── stores/            auth · categories · family · transactions · ui
├── types/             database.types.ts (BD) · models.ts (dominio)
├── utils/             format (moneda/fechas) · validation
└── views/
    ├── auth/          Login · Register · ForgotPassword · Callback
    └── dashboard/     DashboardView
```

**Flujo de datos:** `vista → store (Pinia) → service → supabase`. Los componentes nunca
hablan directamente con Supabase; los servicios encapsulan el SDK y los stores el estado.

## Sistema de diseño

Definido en [`tailwind.config.ts`](./tailwind.config.ts) y [`src/assets/styles/main.css`](./src/assets/styles/main.css).

- **Primary — Monify Mint** `#00b894` (dinero, crecimiento)
- **Secondary — Deep Indigo** `#3a53a8` (confianza, texto, navegación)
- **Tertiary — Warm Coral** `#f5492a` (acentos, alertas)
- **Semánticos:** `income` (verde) / `expense` (coral), más `success/warning/danger/info`
- **Superficies** vía CSS custom properties → **modo claro/oscuro** automático
- Radios generosos (`rounded-card`, `rounded-field`), sombras suaves con tinte, animaciones _spring_.

## Modelo de datos

- **profiles** — 1:1 con el usuario de Auth (preferencias: divisa, locale).
- **family_members** — personas de la familia dentro de una misma cuenta.
- **categories** — ingreso/gasto, icono libre y **límite mensual opcional**.
- **transactions** — movimiento con **fecha obligatoria** (`occurred_on`) → habilita
  vistas semanales / mensuales / anuales. Cada movimiento pertenece al usuario, a un
  miembro y a una categoría.

Todo protegido con **RLS**: cada usuario solo accede a sus propios datos.

## Camino a Capacitor (futuro)

La app ya está preparada, sin dependencias nativas todavía:

- `usePlatform()` centraliza la detección de plataforma (basta cambiar su cuerpo por `Capacitor.getPlatform()`).
- El cliente Supabase documenta cómo cambiar el almacenamiento de sesión a `@capacitor/preferences`.
- `viewport-fit=cover` + utilidades `safe-top` / `safe-bottom` para el notch.
- Cuando toque: `pnpm add @capacitor/core @capacitor/cli && npx cap init`.
