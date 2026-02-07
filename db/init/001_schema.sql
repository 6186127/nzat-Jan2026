-- NZAT Jan2026 - Base schema
-- This script runs automatically on first container init.

-- ========= customers =========
CREATE TABLE IF NOT EXISTS public.customers
(
    id bigint NOT NULL DEFAULT nextval('customers_id_seq'::regclass),
    type text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    business_code text,
    notes text,
    CONSTRAINT customers_pkey PRIMARY KEY (id)
);

-- ========= vehicles =========
CREATE TABLE IF NOT EXISTS public.vehicles
(
    id bigint NOT NULL DEFAULT nextval('vehicles_id_seq'::regclass),
    plate text NOT NULL,
    make text,
    model text,
    year integer,
    vin text,
    engine text,
    rego_expiry date,
    colour text,
    body_style text,
    engine_no text,
    chassis text,
    cc_rating integer,
    fuel_type text,
    seats integer,
    country_of_origin text,
    gross_vehicle_mass integer,
    refrigerant text,
    fuel_tank_capacity_litres numeric(10,2),
    full_combined_range_km numeric(10,2),
    wof_expiry date,
    odometer integer,
    nz_first_registration date,
    customer_id bigint,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    raw_json jsonb,
    CONSTRAINT vehicles_pkey PRIMARY KEY (id),
    CONSTRAINT vehicles_plate_key UNIQUE (plate),
    CONSTRAINT vehicles_customer_id_fkey FOREIGN KEY (customer_id)
        REFERENCES public.customers (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_vehicles_plate
    ON public.vehicles USING btree (plate ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True);

-- ========= jobs =========
CREATE TABLE IF NOT EXISTS public.jobs
(
    id bigint NOT NULL DEFAULT nextval('jobs_id_seq'::regclass),
    status text NOT NULL,
    is_urgent boolean NOT NULL DEFAULT false,
    vehicle_id bigint,
    customer_id bigint,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT jobs_pkey PRIMARY KEY (id),
    CONSTRAINT jobs_vehicle_id_fkey FOREIGN KEY (vehicle_id)
        REFERENCES public.vehicles (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT jobs_customer_id_fkey FOREIGN KEY (customer_id)
        REFERENCES public.customers (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_jobs_vehicle_id ON public.jobs (vehicle_id);
CREATE INDEX IF NOT EXISTS ix_jobs_customer_id ON public.jobs (customer_id);

-- ========= wof_service =========
CREATE TABLE IF NOT EXISTS public.wof_service
(
    id bigint NOT NULL DEFAULT nextval('wof_service_id_seq'::regclass),
    job_id bigint NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wof_service_pkey PRIMARY KEY (id),
    CONSTRAINT wof_service_job_id_key UNIQUE (job_id),
    CONSTRAINT wof_service_job_id_fkey FOREIGN KEY (job_id)
        REFERENCES public.jobs (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- ========= wof_check_items =========
CREATE TABLE IF NOT EXISTS public.wof_check_items
(
    id bigint NOT NULL DEFAULT nextval('wof_check_items_id_seq'::regclass),
    wof_id bigint NOT NULL,
    odo text,
    auth_code text,
    check_sheet text,
    cs_no text,
    wof_label text,
    label_no text,
    source text NOT NULL DEFAULT 'google_sheet',
    source_row text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wof_check_items_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_wof_check_items_wof_id
    ON public.wof_check_items USING btree (wof_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True);

-- ========= wof_fail_reasons =========
CREATE TABLE IF NOT EXISTS public.wof_fail_reasons
(
    id bigint NOT NULL DEFAULT nextval('wof_fail_reasons_id_seq'::regclass),
    label text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wof_fail_reasons_pkey PRIMARY KEY (id),
    CONSTRAINT wof_fail_reasons_label_key UNIQUE (label)
);

-- ========= wof_results =========
CREATE TABLE IF NOT EXISTS public.wof_results
(
    id bigint NOT NULL DEFAULT nextval('wof_results_id_seq'::regclass),
    wof_id bigint NOT NULL,
    result text NOT NULL,
    recheck_expiry_date date,
    fail_reason_id bigint,
    note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wof_results_pkey PRIMARY KEY (id),
    CONSTRAINT wof_results_fail_reason_id_fkey FOREIGN KEY (fail_reason_id)
        REFERENCES public.wof_fail_reasons (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT wof_results_result_check CHECK (result = ANY (ARRAY['Pass','Fail']))
);

CREATE INDEX IF NOT EXISTS ix_wof_results_wof_id_created_at
    ON public.wof_results USING btree (wof_id ASC NULLS LAST, created_at ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True);

-- ========= tags =========
CREATE TABLE IF NOT EXISTS public.tags
(
    id bigint NOT NULL DEFAULT nextval('tags_id_seq'::regclass),
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tags_pkey PRIMARY KEY (id),
    CONSTRAINT tags_name_key UNIQUE (name)
);

-- ========= job_tags =========
CREATE TABLE IF NOT EXISTS public.job_tags
(
    job_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT job_tags_pkey PRIMARY KEY (job_id, tag_id),
    CONSTRAINT job_tags_job_id_fkey FOREIGN KEY (job_id)
        REFERENCES public.jobs (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT job_tags_tag_id_fkey FOREIGN KEY (tag_id)
        REFERENCES public.tags (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_job_tags_tag_id
    ON public.job_tags USING btree (tag_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True);

-- ========= parts services =========
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parts_service_status') THEN
        CREATE TYPE public.parts_service_status AS ENUM (
            'pending_order',
            'needs_pt',
            'parts_trader',
            'pickup_or_transit'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.job_parts_services
(
    id bigint NOT NULL DEFAULT nextval('job_parts_services_id_seq'::regclass),
    job_id bigint NOT NULL,
    description text NOT NULL,
    status public.parts_service_status NOT NULL DEFAULT 'pending_order',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT job_parts_services_pkey PRIMARY KEY (id),
    CONSTRAINT job_parts_services_job_id_fkey FOREIGN KEY (job_id)
        REFERENCES public.jobs (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_job_parts_services_job_id
    ON public.job_parts_services USING btree (job_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True);

CREATE TABLE IF NOT EXISTS public.job_parts_notes
(
    id bigint NOT NULL DEFAULT nextval('job_parts_notes_id_seq'::regclass),
    parts_service_id bigint NOT NULL,
    note text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT job_parts_notes_pkey PRIMARY KEY (id),
    CONSTRAINT job_parts_notes_parts_service_id_fkey FOREIGN KEY (parts_service_id)
        REFERENCES public.job_parts_services (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_job_parts_notes_service_id
    ON public.job_parts_notes USING btree (parts_service_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True);
