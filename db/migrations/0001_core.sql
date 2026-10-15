-- Blank Engine persistent state; manual migration only.
BEGIN;
CREATE TABLE IF NOT EXISTS public.blank_schema_migrations (
  version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.blank_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  owner_ref TEXT,
  spec JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(spec)='object'),
  spec_revision INTEGER NOT NULL DEFAULT 0 CHECK(spec_revision>=0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.blank_spec_revisions (
  project_id UUID NOT NULL REFERENCES public.blank_projects(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision>=0),
  spec JSONB NOT NULL CHECK(jsonb_typeof(spec)='object'),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id,revision)
);
CREATE TABLE IF NOT EXISTS public.blank_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.blank_projects(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL CHECK(char_length(instruction) BETWEEN 1 AND 20000),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','running','review','succeeded','failed','cancelled')),
  base_revision INTEGER NOT NULL CHECK(base_revision>=0),
  request_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, last_error_code TEXT,
  UNIQUE(project_id,request_key)
);
CREATE TABLE IF NOT EXISTS public.blank_agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.blank_agent_runs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('director','world','gameplay','character','mission','qa')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','leased','succeeded','failed','cancelled')),
  provider TEXT, model TEXT,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(inputs)='object'),
  outputs JSONB CHECK(outputs IS NULL OR jsonb_typeof(outputs)='object'),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
  max_attempts INTEGER NOT NULL DEFAULT 2 CHECK(max_attempts BETWEEN 1 AND 10),
  lease_owner TEXT, lease_expires_at TIMESTAMPTZ,
  prompt_tokens INTEGER CHECK(prompt_tokens>=0),
  completion_tokens INTEGER CHECK(completion_tokens>=0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blank_agent_tasks_queue_idx
  ON public.blank_agent_tasks(status,next_attempt_at,created_at) WHERE status='queued';
CREATE INDEX IF NOT EXISTS blank_agent_tasks_run_idx ON public.blank_agent_tasks(run_id);
CREATE INDEX IF NOT EXISTS blank_agent_runs_project_idx
  ON public.blank_agent_runs(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.blank_agent_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id UUID REFERENCES public.blank_agent_runs(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.blank_agent_tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(char_length(kind) BETWEEN 1 AND 100),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (run_id IS NOT NULL OR task_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS blank_agent_events_run_idx ON public.blank_agent_events(run_id,id);
INSERT INTO public.blank_schema_migrations(version) VALUES ('0001_core')
ON CONFLICT(version) DO NOTHING;
COMMIT;
