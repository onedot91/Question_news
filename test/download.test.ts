import assert from 'node:assert/strict'
import test from 'node:test'

import type { Question } from '../src/lib/data.ts'
import { buildTxtContent, selectQuestionsForDownload } from '../src/lib/download.ts'

const questions = [
  {
    id: 'downloaded',
    nickname: '하늘',
    question_text: '이미 받은 질문은?',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    downloaded_at: '2026-09-01T01:00:00.000Z',
  },
  {
    id: 'pending-late',
    nickname: '바다',
    question_text: '나중에 들어온 질문은?',
    created_at: '2026-09-01T03:00:00.000Z',
    updated_at: '2026-09-01T03:00:00.000Z',
    downloaded_at: null,
  },
  {
    id: 'pending-early',
    nickname: '구름',
    question_text: '먼저 들어온 질문은?',
    created_at: '2026-09-01T02:00:00.000Z',
    updated_at: '2026-09-01T02:00:00.000Z',
    downloaded_at: null,
  },
] satisfies readonly Question[]

test('누적 다운로드는 아직 받지 않은 질문만 반환한다', () => {
  const whenSelected = selectQuestionsForDownload(questions, 'cumulative')

  assert.deepEqual(whenSelected.map((question) => question.id), ['pending-late', 'pending-early'])
})

test('전체 다운로드는 다운로드 완료 여부와 관계없이 모든 질문을 반환한다', () => {
  const whenSelected = selectQuestionsForDownload(questions, 'full')

  assert.deepEqual(whenSelected.map((question) => question.id), ['downloaded', 'pending-late', 'pending-early'])
})

test('TXT는 작성 순서대로 번호와 닉네임을 붙인다', () => {
  const content = buildTxtContent(questions.slice(1))

  assert.deepEqual(content.split('\n').slice(2), ['1. 먼저 들어온 질문은? (구름)', '2. 나중에 들어온 질문은? (바다)'])
})
