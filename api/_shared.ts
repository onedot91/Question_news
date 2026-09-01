import type { DownloadMode, Question, QuestionType, WeeklyTopic } from '../src/lib/data'

declare const process: {
  readonly env: {
    readonly DATABASE_URL?: string
  }
}

type QueryValue = string | readonly string[] | undefined
type NeonModule = typeof import('@neondatabase/serverless')
type QueryParam = string | number | boolean | null | readonly string[]
type SqlClient = {
  query(queryWithPlaceholders: string, params?: readonly QueryParam[]): Promise<unknown>
}
const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1000
const SCHOOL_TIMER_ORIGIN = 'https://school-timer.vercel.app'

export interface ApiRequest {
  readonly method?: string
  readonly query: Record<string, QueryValue>
  readonly body?: unknown
}

export interface ApiResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
  end(): void
}

class ApiError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

type Row = Record<string, unknown>

async function getSql(): Promise<SqlClient> {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new ApiError(500, 'DATABASE_URL 환경변수가 없습니다.')
  }

  const { neon } = await import('@neondatabase/serverless')
  const client: ReturnType<NeonModule['neon']> = neon(databaseUrl)

  return {
    query(queryWithPlaceholders, params) {
      return client.query(queryWithPlaceholders, params ? [...params] : undefined)
    },
  }
}

export function sql(): Promise<SqlClient> {
  return getSql()
}

export async function queryRows(queryWithPlaceholders: string, params?: readonly QueryParam[]): Promise<Row[]> {
  const db = await sql()
  const result = await db.query(queryWithPlaceholders, params)

  if (Array.isArray(result) && result.every(isRow)) {
    return result
  }

  throw new ApiError(500, 'DB 응답 형식이 올바르지 않습니다.')
}

export function sendMethodNotAllowed(res: ApiResponse, allowedMethods: readonly string[]) {
  res.setHeader('Allow', allowedMethods.join(', '))
  res.status(405).json({ message: '허용되지 않는 요청입니다.' })
}

export function applySchoolTimerCors(res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', SCHOOL_TIMER_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

export function sendOptionsOk(res: ApiResponse) {
  res.status(204).end()
}

export function sendError(res: ApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  res.status(500).json({ message: '서버에서 처리하지 못했습니다.' })
}

export function firstQueryValue(value: QueryValue): string | null {
  if (typeof value === 'string') {
    return value
  }

  if (!value) {
    return null
  }

  return value[0] ?? null
}

export function parseBodyObject(body: unknown): Row {
  if (typeof body === 'string') {
    const parsed = JSON.parse(body)

    if (isRow(parsed)) {
      return parsed
    }
  }

  if (isRow(body)) {
    return body
  }

  throw new ApiError(400, '요청 형식이 올바르지 않습니다.')
}

export function parseWeekKey(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  throw new ApiError(400, 'weekKey가 필요합니다.')
}

export function currentWeekKey(date = new Date()): string {
  const koreaDate = new Date(date.getTime() + KOREA_TIME_OFFSET_MS)
  const target = new Date(
    Date.UTC(koreaDate.getUTCFullYear(), koreaDate.getUTCMonth(), koreaDate.getUTCDate()),
  )
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return `${target.getUTCFullYear()}-${String(weekNumber).padStart(2, '0')}`
}

export function parseStudentNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 23) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 23) {
      return parsed
    }
  }

  throw new ApiError(400, '학생 번호가 올바르지 않습니다.')
}

export function parseQuestionType(value: unknown): QuestionType {
  if (value === 'personal' || value === 'topic') {
    return value
  }

  throw new ApiError(400, '질문 종류가 올바르지 않습니다.')
}

export function parseDownloadMode(value: unknown): DownloadMode {
  if (value === 'all') {
    return value
  }

  return parseQuestionType(value)
}

export function parseQuestionText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  throw new ApiError(400, '질문 내용이 필요합니다.')
}

export function parseTopicText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  throw new ApiError(400, '주제 내용이 필요합니다.')
}

export function parseId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  throw new ApiError(400, 'id가 필요합니다.')
}

export function readQuestion(row: Row): Question {
  return {
    id: readString(row, 'id'),
    student_number: readNumber(row, 'student_number'),
    question_type: parseQuestionType(row.question_type),
    question_text: readString(row, 'question_text'),
    week_key: readString(row, 'week_key'),
    created_at: readTimestamp(row, 'created_at'),
    updated_at: readTimestamp(row, 'updated_at'),
    downloaded_at: readNullableTimestamp(row, 'downloaded_at'),
  }
}

export function readWeeklyTopic(row: Row): WeeklyTopic {
  return {
    id: readString(row, 'id'),
    week_key: readString(row, 'week_key'),
    topic_text: readString(row, 'topic_text'),
    created_at: readTimestamp(row, 'created_at'),
    updated_at: readTimestamp(row, 'updated_at'),
  }
}

export function readQuestionRows(rows: readonly Row[]): Question[] {
  return rows.map(readQuestion)
}

export function readWeeklyTopicOrNull(rows: readonly Row[]): WeeklyTopic | null {
  const first = rows[0]

  return first ? readWeeklyTopic(first) : null
}

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(row: Row, key: string): string {
  const value = row[key]

  if (typeof value === 'string') {
    return value
  }

  throw new ApiError(500, `${key} 값이 올바르지 않습니다.`)
}

function readNumber(row: Row, key: string): number {
  const value = row[key]

  if (typeof value === 'number') {
    return value
  }

  throw new ApiError(500, `${key} 값이 올바르지 않습니다.`)
}

function readTimestamp(row: Row, key: string): string {
  const value = row[key]

  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  throw new ApiError(500, `${key} 값이 올바르지 않습니다.`)
}

function readNullableTimestamp(row: Row, key: string): string | null {
  const value = row[key]

  if (value === null) {
    return null
  }

  return readTimestamp(row, key)
}
