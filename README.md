# 질문하기

초등학교 3학년 학생 1번부터 23번까지 이번 주 개인 질문과 주제 질문을 제출하고, 교사가 관리자 화면에서 질문을 확인한 뒤 TXT 파일로 내려받는 Vite + React + TypeScript + Supabase 웹사이트입니다.

## 설치 및 실행

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에 Supabase 프로젝트 값을 넣은 뒤 브라우저에서 Vite가 알려주는 주소로 접속합니다. 개발 중에는 `npm run dev`로 수정 사항이 즉시 반영됩니다.

## 필요한 환경 변수

```bash
VITE_SUPABASE_URL=Supabase 프로젝트 URL
VITE_SUPABASE_ANON_KEY=Supabase anon public key
```

## Supabase SQL

Supabase SQL Editor에서 [supabase/schema.sql](/Users/ibyeonghyeon/Documents/GitHub/Question_news/supabase/schema.sql) 파일 내용을 실행합니다.

## 주요 기능

- 처음 접속하면 1번부터 23번, 교사용 0번을 선택합니다.
- 선택한 번호는 `localStorage`에 저장되어 다음 접속 때 바로 해당 화면으로 이동합니다.
- 학생은 한국 시간 기준 월요일부터 일요일까지 이번 주 개인 질문 1개, 주제 질문 1개를 저장하고 같은 주 안에서 다시 수정할 수 있습니다.
- 월요일에 새 주차가 시작되면 학생 화면의 개인 질문과 주제 질문 입력칸은 비워지고, 지난 질문은 우측 상단 `내 기록`에서 확인할 수 있습니다.
- 같은 `student_number + question_type + week_key` 조합은 Supabase unique constraint와 upsert로 하나만 유지됩니다.
- 교사는 이번 주 질문을 학생 번호순으로 확인하고, 개인 질문/주제 질문/전체 보기로 필터링할 수 있습니다.
- 관리자 화면에서 질문 수정, 삭제, 새로고침, TXT 다운로드가 가능합니다.
- TXT 다운로드 첫 줄은 `[$goma-newspaper](/Users/ibyeonghyeon/.codex/skills/goma-newspaper/SKILL.md)` 형식으로 생성됩니다.
