DO $$
BEGIN
    IF to_regclass('public.job_parts_services') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parts_service_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parts_service_status_new') THEN
            CREATE TYPE public.parts_service_status_new AS ENUM (
                'pending_order',
                'needs_pt',
                'parts_trader',
                'pickup_or_transit'
            );
        END IF;

        UPDATE public.job_parts_services
        SET status = 'pending_order'
        WHERE status::text IN ('quote_pending');

        UPDATE public.job_parts_services
        SET status = 'pickup_or_transit'
        WHERE status::text IN ('in_transit', 'received', 'repair_done');

        ALTER TABLE public.job_parts_services
            ALTER COLUMN status TYPE public.parts_service_status_new
            USING status::text::public.parts_service_status_new;

        ALTER TABLE public.job_parts_services
            ALTER COLUMN status SET DEFAULT 'pending_order';

        DROP TYPE public.parts_service_status;
        ALTER TYPE public.parts_service_status_new RENAME TO parts_service_status;
    ELSE
        CREATE TYPE public.parts_service_status AS ENUM (
            'pending_order',
            'needs_pt',
            'parts_trader',
            'pickup_or_transit'
        );
    END IF;
END$$;
