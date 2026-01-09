-- Create case_call_logs table for tracking telecaller interactions
CREATE TABLE IF NOT EXISTS public.case_call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  tenant_id uuid NOT NULL,
  case_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  call_status text NOT NULL,
  ptp_datetime timestamp with time zone NULL,
  call_notes text NULL,
  call_duration integer NULL DEFAULT 0,
  call_result text NULL,
  amount_collected numeric(15, 2) NULL DEFAULT 0,
  callback_datetime timestamp with time zone NULL,
  callback_completed boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT case_call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT case_call_logs_case_id_fkey FOREIGN KEY (case_id) REFERENCES customer_cases (id) ON DELETE CASCADE,
  CONSTRAINT case_call_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT case_call_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT case_call_logs_amount_collected_check CHECK ((amount_collected >= (0)::numeric)),
  CONSTRAINT case_call_logs_call_status_check CHECK (
    (
      call_status = ANY (
        ARRAY[
          'WN'::text,
          'SW'::text,
          'RNR'::text,
          'BUSY'::text,
          'CALL_BACK'::text,
          'PTP'::text,
          'FUTURE_PTP'::text,
          'BPTP'::text,
          'RTP'::text,
          'NC'::text,
          'CD'::text,
          'INC'::text,
          'PAYMENT_RECEIVED'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create optimization indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON public.case_call_logs USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_case ON public.case_call_logs USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.case_call_logs USING btree (call_status);
CREATE INDEX IF NOT EXISTS idx_call_logs_employee ON public.case_call_logs USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_ptp ON public.case_call_logs USING btree (ptp_datetime);
