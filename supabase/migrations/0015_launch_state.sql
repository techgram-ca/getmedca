-- Whether the patient site is open for business yet.
--
-- Before launch the public site is a single page: the admin's message, how the
-- service works, and nothing to click. Pharmacy pages stay visible — showing a
-- pharmacy its own page is most of the point of the period before launch — but
-- nothing on them can be ordered.
--
-- A timestamp rather than a boolean, so the record says when it opened and not
-- merely that it did. Null is the pre-launch state, which is also the state any
-- existing database arrives in: launching is a deliberate act, never a default
-- a migration performs on someone's behalf.

alter table public.platform_settings
  add column if not exists launched_at timestamptz,
  add column if not exists launch_message text;

comment on column public.platform_settings.launched_at is
  'When the patient site opened. Null means it has not launched; ordering and consultations are refused.';
comment on column public.platform_settings.launch_message is
  'Shown on the public homepage before launch. Null falls back to copy in the app.';
