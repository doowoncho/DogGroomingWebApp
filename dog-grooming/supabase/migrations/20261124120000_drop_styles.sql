-- Grooming styles are no longer offered. Remove the table and the columns
-- that referenced it. A copy of the rows is in supabase/backups/styles_backup_2026-11-24.sql.

drop table if exists public.styles;
alter table public.bookings drop column if exists style_id;
alter table public.services drop column if exists needs_style;
