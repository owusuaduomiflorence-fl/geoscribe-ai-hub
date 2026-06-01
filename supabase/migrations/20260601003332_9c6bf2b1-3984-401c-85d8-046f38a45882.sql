
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS display_preference text NOT NULL DEFAULT 'full';

-- Backfill: split existing display_name into first/last using ., _, space, or camelCase boundary
UPDATE public.profiles
SET
  first_name = COALESCE(first_name, initcap(split_part(
    regexp_replace(
      regexp_replace(coalesce(display_name,''), '([a-z])([A-Z])', '\1 \2', 'g'),
      '[._]+', ' ', 'g'
    ), ' ', 1))),
  last_name = COALESCE(last_name, NULLIF(initcap(
    btrim(substr(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(display_name,''), '([a-z])([A-Z])', '\1 \2', 'g'),
          '[._]+', ' ', 'g'
        ),
        '[0-9]+', '', 'g'
      ),
      position(' ' in
        regexp_replace(
          regexp_replace(coalesce(display_name,''), '([a-z])([A-Z])', '\1 \2', 'g'),
          '[._]+', ' ', 'g'
        )
      ) + 1
    ))
  ), ''))
WHERE first_name IS NULL OR last_name IS NULL;
