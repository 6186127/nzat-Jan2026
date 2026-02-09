DO $$
BEGIN
    IF to_regclass('public.job_wof_records') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.job_wof_records
        ADD COLUMN IF NOT EXISTS is_new_wof boolean;
END$$;
