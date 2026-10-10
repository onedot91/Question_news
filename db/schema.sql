create extension if not exists "pgcrypto";

-- 누구나 닉네임과 함께 자유롭게 질문을 남기고, 교사가 모아서 내려받는 테이블입니다.
-- 이전 학생 번호 방식의 questions / weekly_topics 테이블은 건드리지 않습니다.
create table if not exists public.free_questions (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  question_text text not null,
  author_token uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  downloaded_at timestamptz,
  constraint free_questions_nickname_length check (char_length(trim(nickname)) between 1 and 12),
  constraint free_questions_text_length check (char_length(trim(question_text)) between 1 and 60),
  constraint free_questions_text_has_space check (trim(question_text) ~ '[[:space:]]'),
  constraint free_questions_text_single_question_mark check (trim(question_text) ~ '^[^?？]+[?？]$')
);

create index if not exists free_questions_created_at_idx on public.free_questions (created_at desc);
create index if not exists free_questions_author_token_idx on public.free_questions (author_token, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists free_questions_set_updated_at on public.free_questions;

create trigger free_questions_set_updated_at
before update of question_text on public.free_questions
for each row
execute function public.set_updated_at();
