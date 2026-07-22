-- Monify · Movimientos recurrentes con calendario personalizado (meses concretos + día)
--
-- Ejecuta este script en el editor SQL de Supabase (Dashboard → SQL Editor) o vía CLI
-- (`supabase db push`). Habilita la frecuencia "custom" y las columnas que guardan
-- en qué meses del año y en qué día se debe generar el movimiento recurrente.
--
-- Ejemplo de uso (IBI en junio, agosto, octubre y diciembre, el día 5):
--   frequency    = 'custom'
--   months       = '{6,8,10,12}'
--   day_of_month = 5
--
-- NOTA sobre el enum: en PostgreSQL un valor de enum recién añadido no puede usarse
-- dentro de la MISMA transacción en la que se crea. Este script solo AÑADE el valor y
-- las columnas (no inserta filas con 'custom'), por lo que es seguro ejecutarlo de una vez.

-- 1) Nuevo valor de frecuencia
alter type recurring_frequency add value if not exists 'custom';

-- 2) Columnas para el calendario personalizado
alter table public.recurring_transactions
  add column if not exists months smallint[],
  add column if not exists day_of_month smallint;

-- 3) Regla de integridad para el día del mes (1-31)
alter table public.recurring_transactions
  drop constraint if exists recurring_transactions_day_of_month_check;

alter table public.recurring_transactions
  add constraint recurring_transactions_day_of_month_check
  check (day_of_month is null or (day_of_month between 1 and 31));

-- 4) Documentación de las columnas
comment on column public.recurring_transactions.months is
  'Meses (1-12) en los que se ejecuta una recurrencia "custom". NULL para el resto de frecuencias.';

comment on column public.recurring_transactions.day_of_month is
  'Día del mes (1-31) en que se ejecuta una recurrencia "custom". Se recorta al último día válido del mes.';
