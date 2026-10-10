# 질문하기

누구나 닉네임을 쓰고 자유롭게 질문을 남기면, 교사가 관리자 화면에서 질문을 모아 보고 TXT 파일로 내려받는 Vite + React + TypeScript + Vercel API + Neon 웹사이트입니다.

## 설치 및 실행

```bash
npm install
cp .env.example .env
npm run dev:vercel
```

`.env`에 Neon 연결 값을 넣은 뒤 브라우저에서 Vercel이 알려주는 주소로 접속합니다. Vercel API 함수가 필요하므로 전체 기능 확인은 `npm run dev:vercel`을 사용합니다. `npm run dev`는 Vite 화면 전용 서버라서 질문 저장/조회 API는 동작하지 않습니다.

## 필요한 환경 변수

```bash
DATABASE_URL=Neon connection string
```

`DATABASE_URL`은 브라우저에 공개되면 안 되므로 `VITE_`로 시작하면 안 됩니다. Vercel 프로젝트 환경변수에도 `DATABASE_URL` 이름으로 추가합니다.

## Neon SQL

Neon SQL Editor에서 [db/schema.sql](db/schema.sql) 파일 내용을 실행합니다. 새 `free_questions` 테이블을 만들며, 이전 학생 번호 방식의 `questions` / `weekly_topics` 테이블은 건드리지 않습니다.

## 주요 기능

- 접속하면 바로 질문 화면이 나옵니다. 닉네임(필수, 12자 이내)과 질문을 써서 보냅니다. 몇 개든 보낼 수 있습니다.
- 닉네임은 브라우저에 기억되어 다음 질문 때 다시 쓰지 않아도 됩니다.
- 브라우저마다 익명 식별값(`question-news-author-token`)을 만들어, 아래 `내가 한 질문`에 그 브라우저에서 보낸 질문만 보여 줍니다. 다른 사람의 질문은 보이지 않습니다.
- 질문 검사 규칙(60자 이내, 띄어쓰기 1회 이상, 특수문자는 물음표만, 물음표 하나로 끝내기, 금지어)은 `src/lib/validation.ts` 한 곳에 있으며 브라우저와 서버가 함께 씁니다.
- 질문 화면 왼쪽 위 빈 곳을 5번 누르면 교사 화면으로 들어갑니다. `나가기` 버튼이나 `Ctrl/Cmd + Alt + Enter`로 돌아옵니다.
- 교사 화면에서는 모든 질문을 최신순으로 보고, 수정·삭제·초기화·TXT 다운로드(누적/전체)를 할 수 있습니다.
- TXT는 작성 순서대로 `1. 질문 (닉네임)` 형식이며, 첫 줄은 `[$goma-newspaper](/Users/ibyeonghyeon/.codex/skills/goma-newspaper/SKILL.md)` 헤더입니다.
