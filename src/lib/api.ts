import ky from 'ky'

import type { Question, QuestionType, WeeklyTopic } from './data'

interface StudentData {
  readonly questions: Question[]
  readonly history: Question[]
  readonly weeklyTopic: WeeklyTopic | null
}

interface AdminData {
  readonly questions: Question[]
  readonly weeklyTopic: WeeklyTopic | null
}

interface TopicWeeksData {
  readonly weekKeys: string[]
}

interface SaveQuestionData {
  readonly question: Question | null
}

interface StudentDataParams {
  readonly studentNumber: number
  readonly weekKey: string
}

interface SaveQuestionParams {
  readonly studentNumber: number
  readonly questionType: QuestionType
  readonly questionText: string
  readonly weekKey: string
}

const api = ky.create({
  prefix: '/api',
  retry: 0,
  timeout: 10000,
})

export function loadStudentData(params: StudentDataParams): Promise<StudentData> {
  return api
    .get('student', { searchParams: { studentNumber: params.studentNumber, weekKey: params.weekKey } })
    .json<StudentData>()
}

export function loadAdminData(weekKey: string): Promise<AdminData> {
  return api.get('admin', { searchParams: { weekKey } }).json<AdminData>()
}

export function loadTopicWeekKeys(weekKeys: readonly string[]): Promise<TopicWeeksData> {
  return api.get('topic-weeks', { searchParams: { weekKeys: weekKeys.join(',') } }).json<TopicWeeksData>()
}

export function saveQuestion(params: SaveQuestionParams): Promise<SaveQuestionData> {
  return api.post('questions', { json: params }).json<SaveQuestionData>()
}

export function updateQuestion(id: string, questionText: string): Promise<{ readonly ok: boolean }> {
  return api.patch('questions', { json: { id, questionText } }).json<{ readonly ok: boolean }>()
}

export function deleteQuestion(id: string): Promise<{ readonly ok: boolean }> {
  return api.delete('questions', { searchParams: { id } }).json<{ readonly ok: boolean }>()
}

export function saveWeeklyTopic(weekKey: string, topicText: string): Promise<{ readonly ok: boolean }> {
  return api.post('topics', { json: { weekKey, topicText } }).json<{ readonly ok: boolean }>()
}

export function resetAllRecords(): Promise<{ readonly ok: boolean }> {
  return api.delete('reset').json<{ readonly ok: boolean }>()
}
