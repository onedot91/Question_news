import assert from 'node:assert/strict'
import test from 'node:test'

import type { Question } from '../src/lib/data.ts'
import { selectQuestionsForDownload } from '../src/lib/download.ts'

const questions = [
  {
    id: 'personal-downloaded',
    student_number: 1,
    question_type: 'personal',
    question_text: '이미 받은 개인 질문은?',
    week_key: '2026-36',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    downloaded_at: '2026-09-01T01:00:00.000Z',
  },
  {
    id: 'personal-pending',
    student_number: 21,
    question_type: 'personal',
    question_text: '새로 들어온 개인 질문은?',
    week_key: '2026-36',
    created_at: '2026-09-01T02:00:00.000Z',
    updated_at: '2026-09-01T02:00:00.000Z',
    downloaded_at: null,
  },
  {
    id: 'topic-pending',
    student_number: 22,
    question_type: 'topic',
    question_text: '새로 들어온 주제 질문은?',
    week_key: '2026-36',
    created_at: '2026-09-01T03:00:00.000Z',
    updated_at: '2026-09-01T03:00:00.000Z',
    downloaded_at: null,
  },
] satisfies readonly Question[]

test('누적 다운로드는 선택한 종류의 미다운로드 질문만 반환한다', () => {
  const givenQuestions = questions
  const whenSelected = selectQuestionsForDownload(givenQuestions, 'personal', 'cumulative')
  const thenQuestionIds = ['personal-pending']

  assert.deepEqual(whenSelected.map((question) => question.id), thenQuestionIds)
})

test('전체 다운로드는 다운로드 완료 여부와 관계없이 현재 질문을 모두 반환한다', () => {
  const givenQuestions = questions
  const whenSelected = selectQuestionsForDownload(givenQuestions, 'all', 'full')
  const thenQuestionIds = ['personal-downloaded', 'personal-pending', 'topic-pending']

  assert.deepEqual(whenSelected.map((question) => question.id), thenQuestionIds)
})
