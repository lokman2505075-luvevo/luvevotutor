alter table public.admission_applications
  add column if not exists ssc_gpa text,
  add column if not exists hsc_gpa text;