-- ══════════════════════════════════════════════════════════════════════════
--  Monify — esquema inicial
--  Pégalo tal cual en el SQL Editor de Supabase y ejecútalo.
--  Crea tablas, enum, políticas RLS y triggers de alta automática.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Tipos ──────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'category_kind') then
    create type public.category_kind as enum ('income', 'expense');
  end if;
end$$;

-- ── profiles ─────────────────────────────────────────────────────────────
-- 1:1 con auth.users. Guarda preferencias del usuario.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null default '',
  currency     text        not null default 'EUR',
  locale       text        not null default 'es-ES',
  created_at   timestamptz not null default now()
);

-- ── family_members ──────────────────────────────────────────────────────
-- Personas de la familia dentro de la cuenta de un mismo usuario.
create table if not exists public.family_members (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text        not null,
  color       text        not null default '#00b894',
  avatar_icon text        not null default 'solar:user-bold',
  is_self     boolean     not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists family_members_owner_idx on public.family_members (owner_id);

-- ── categories ───────────────────────────────────────────────────────────
-- Categorías de ingreso/gasto con icono libre y límite mensual opcional.
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid                not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text                not null,
  icon          text                not null default 'solar:tag-bold',
  color         text                not null default '#3a53a8',
  kind          public.category_kind not null,
  monthly_limit numeric(12, 2),                                  -- null = sin límite
  created_at    timestamptz         not null default now(),
  constraint categories_limit_positive check (monthly_limit is null or monthly_limit > 0)
);
create index if not exists categories_owner_idx on public.categories (owner_id);

-- ── transactions ─────────────────────────────────────────────────────────
-- Movimientos: cada uno asociado al usuario (owner_id), a un miembro y a una categoría.
-- `occurred_on` es obligatorio → permite vistas semanales / mensuales / anuales.
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid                not null default auth.uid() references public.profiles (id) on delete cascade,
  family_member_id uuid                not null references public.family_members (id) on delete restrict,
  category_id      uuid                not null references public.categories (id) on delete restrict,
  kind             public.category_kind not null,
  amount           numeric(12, 2)      not null check (amount > 0),
  note             text,
  occurred_on      date                not null default current_date,
  created_at       timestamptz         not null default now()
);
create index if not exists transactions_owner_date_idx on public.transactions (owner_id, occurred_on desc);
create index if not exists transactions_category_idx  on public.transactions (category_id);
create index if not exists transactions_member_idx    on public.transactions (family_member_id);

-- ══════════════════════════════════════════════════════════════════════════
--  Row Level Security — cada usuario solo ve y toca SUS datos
-- ══════════════════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.family_members enable row level security;
alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;

-- profiles: el usuario gestiona su propia fila
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- family_members / categories / transactions: filtradas por owner_id = usuario actual
drop policy if exists "family_members_owner" on public.family_members;
create policy "family_members_owner" on public.family_members
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "categories_owner" on public.categories;
create policy "categories_owner" on public.categories
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ══════════════════════════════════════════════════════════════════════════
--  Automatismos: al registrarse un usuario, crear su perfil, su ficha "yo"
--  y unas categorías de ejemplo.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, display_name)
  values (new.id, v_name);

  insert into public.family_members (owner_id, name, is_self, avatar_icon)
  values (new.id, v_name, true, 'solar:user-bold');

  insert into public.categories (owner_id, name, icon, color, kind) values
    (new.id, 'Nómina',      'solar:wallet-money-bold', '#00b894', 'income'),
    (new.id, 'Alimentación', 'solar:cart-large-2-bold', '#f5492a', 'expense'),
    (new.id, 'Hogar',        'solar:home-2-bold',       '#3a53a8', 'expense'),
    (new.id, 'Transporte',   'solar:bus-bold',          '#f6a609', 'expense');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
