import ky from 'ky'

import type { Question } from './data'

interface QuestionsData {
  readonly questions: Question[]
}

interface CreateQuestionData {
  readonly question: Question | null
}

interface CreateQuestionParams {
  readonly nickname: string
  readonly questionText: string
  readonly authorToken: string
}

const api = ky.create({
  prefix: '/api',
  retry: 0,
  timeout: 10000,
})

export function loadMyQuestions(authorToken: string): Promise<QuestionsData> {
  return api.get('questions', { searchParams: { authorToken } }).json<QuestionsData>()
}

export function loadPublicQuestions(): Promise<QuestionsData> {
  return api.get('questions').json<QuestionsData>()
}

export function createQuestion(params: CreateQuestionParams): Promise<CreateQuestionData> {
  return api.post('questions', { json: params }).json<CreateQuestionData>()
}

export function loadAdminQuestions(): Promise<QuestionsData> {
  return api.get('admin').json<QuestionsData>()
}

export function updateQuestion(id: string, questionText: string): Promise<{ readonly ok: boolean }> {
  return api.patch('questions', { json: { id, questionText } }).json<{ readonly ok: boolean }>()
}

export function deleteQuestion(id: string): Promise<{ readonly ok: boolean }> {
  return api.delete('questions', { searchParams: { id } }).json<{ readonly ok: boolean }>()
}

export function claimCumulativeDownload(): Promise<QuestionsData> {
  return api.post('downloads').json<QuestionsData>()
}

export function resetAllRecords(): Promise<{ readonly ok: boolean }> {
  return api.delete('reset').json<{ readonly ok: boolean }>()
}
