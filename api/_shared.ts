import type { Question } from '../src/lib/data'
import { validateNickname, validateQuestionText } from '../src/lib/validation.js'

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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export function parseQuestionText(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  const message = validateQuestionText(text)

  if (message) {
    throw new ApiError(400, message)
  }

  return text
}

export function parseNickname(value: unknown): string {
  const nickname = typeof value === 'string' ? value.trim() : ''
  const message = validateNickname(nickname)

  if (message) {
    throw new ApiError(400, message)
  }

  return nickname
}

export function parseUuid(value: unknown, name: string): string {
  if (typeof value === 'string' && UUID_PATTERN.test(value.trim())) {
    return value.trim()
  }

  throw new ApiError(400, `${name}가 올바르지 않습니다.`)
}

export function readQuestion(row: Row): Question {
  return {
    id: readString(row, 'id'),
    nickname: readString(row, 'nickname'),
    question_text: readString(row, 'question_text'),
    created_at: readTimestamp(row, 'created_at'),
    updated_at: readTimestamp(row, 'updated_at'),
    downloaded_at: readNullableTimestamp(row, 'downloaded_at'),
  }
}

export function readQuestionRows(rows: readonly Row[]): Question[] {
  return rows.map(readQuestion)
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
