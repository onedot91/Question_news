create extension if not exists "pgcrypto";

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  student_number integer not null check (student_number between 1 and 23),
  question_type text not null check (question_type in ('personal', 'topic')),
  question_text text not null check (length(trim(question_text)) > 0),
  constraint question_text_length check (char_length(trim(question_text)) <= 60),
  constraint question_text_has_space check (trim(question_text) ~ '[[:space:]]'),
  constraint question_text_single_question_mark check (trim(question_text) ~ '^[^?？]+[?？]$'),
  week_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  downloaded_at timestamptz,
  unique (student_number, question_type, week_key)
);

alter table public.questions
add column if not exists downloaded_at timestamptz;

alter table public.questions
drop constraint if exists question_text_length;

alter table public.questions
add constraint question_text_length
check (char_length(trim(question_text)) <= 60);

alter table public.questions
drop constraint if exists question_text_has_space;

alter table public.questions
add constraint question_text_has_space
check (trim(question_text) ~ '[[:space:]]');

alter table public.questions
drop constraint if exists question_text_single_question_mark;

alter table public.questions
add constraint question_text_single_question_mark
check (trim(question_text) ~ '^[^?？]+[?？]$');

alter table public.questions enable row level security;

create table if not exists public.weekly_topics (
  id uuid primary key default gen_random_uuid(),
  week_key text not null unique,
  topic_text text not null check (length(trim(topic_text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weekly_topics
drop constraint if exists weekly_topics_topic_text_length;

alter table public.weekly_topics
add constraint weekly_topics_topic_text_length
check (char_length(trim(topic_text)) <= 40);

alter table public.weekly_topics enable row level security;

drop policy if exists "Anyone can read questions" on public.questions;
create policy "Anyone can read questions"
on public.questions
for select
using (true);

drop policy if exists "Anyone can insert questions" on public.questions;
create policy "Anyone can insert questions"
on public.questions
for insert
with check (
  student_number between 1 and 23
  and question_type in ('personal', 'topic')
  and length(trim(question_text)) > 0
  and char_length(trim(question_text)) <= 60
  and trim(question_text) ~ '[[:space:]]'
  and trim(question_text) ~ '^[^?？]+[?？]$'
);

drop policy if exists "Anyone can update questions" on public.questions;
create policy "Anyone can update questions"
on public.questions
for update
using (true)
with check (
  student_number between 1 and 23
  and question_type in ('personal', 'topic')
  and length(trim(question_text)) > 0
  and char_length(trim(question_text)) <= 60
  and trim(question_text) ~ '[[:space:]]'
  and trim(question_text) ~ '^[^?？]+[?？]$'
);

drop policy if exists "Anyone can delete questions" on public.questions;
create policy "Anyone can delete questions"
on public.questions
for delete
using (true);

drop policy if exists "Anyone can read weekly topics" on public.weekly_topics;
create policy "Anyone can read weekly topics"
on public.weekly_topics
for select
using (true);

drop policy if exists "Anyone can insert weekly topics" on public.weekly_topics;
create policy "Anyone can insert weekly topics"
on public.weekly_topics
for insert
with check (
  length(trim(topic_text)) > 0
  and char_length(trim(topic_text)) <= 40
);

drop policy if exists "Anyone can update weekly topics" on public.weekly_topics;
create policy "Anyone can update weekly topics"
on public.weekly_topics
for update
using (true)
with check (
  length(trim(topic_text)) > 0
  and char_length(trim(topic_text)) <= 40
);

drop policy if exists "Anyone can delete weekly topics" on public.weekly_topics;
create policy "Anyone can delete weekly topics"
on public.weekly_topics
for delete
using (true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists questions_set_updated_at on public.questions;

create trigger questions_set_updated_at
before update of question_text on public.questions
for each row
execute function public.set_updated_at();

drop trigger if exists weekly_topics_set_updated_at on public.weekly_topics;

create trigger weekly_topics_set_updated_at
before update on public.weekly_topics
for each row
execute function public.set_updated_at();
