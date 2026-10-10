import {
  firstQueryValue,
  parseBodyObject,
  parseNickname,
  parseQuestionText,
  parseUuid,
  queryRows,
  readQuestionRows,
  sendError,
  sendMethodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'

const QUESTION_COLUMNS = 'id, nickname, question_text, created_at, updated_at, downloaded_at'
const MY_QUESTIONS_LIMIT = 100
const PUBLIC_QUESTIONS_LIMIT = 200

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method === 'GET') {
      if (firstQueryValue(req.query.authorToken)) {
        await listMyQuestions(req, res)
      } else {
        await listPublicQuestions(res)
      }
      return
    }

    if (req.method === 'POST') {
      await createQuestion(req, res)
      return
    }

    if (req.method === 'PATCH') {
      await updateQuestion(req, res)
      return
    }

    if (req.method === 'DELETE') {
      await deleteQuestion(req, res)
      return
    }

    sendMethodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE'])
  } catch (error) {
    sendError(res, error)
  }
}

async function listMyQuestions(req: ApiRequest, res: ApiResponse) {
  const authorToken = parseUuid(firstQueryValue(req.query.authorToken), 'authorToken')
  const rows = await queryRows(
    `
      select ${QUESTION_COLUMNS}
      from public.free_questions
      where author_token = $1
      order by created_at desc
      limit ${MY_QUESTIONS_LIMIT}
    `,
    [authorToken],
  )

  res.status(200).json({ questions: readQuestionRows(rows) })
}

// 모두에게 보여 주는 최근 질문입니다. 다운로드 상태는 교사 화면에서만 씁니다.
async function listPublicQuestions(res: ApiResponse) {
  const rows = await queryRows(
    `
      select id, nickname, question_text, created_at, updated_at, null::timestamptz as downloaded_at
      from public.free_questions
      order by created_at desc
      limit ${PUBLIC_QUESTIONS_LIMIT}
    `,
  )

  res.status(200).json({ questions: readQuestionRows(rows) })
}

async function createQuestion(req: ApiRequest, res: ApiResponse) {
  const body = parseBodyObject(req.body)
  const nickname = parseNickname(body.nickname)
  const questionText = parseQuestionText(body.questionText)
  const authorToken = parseUuid(body.authorToken, 'authorToken')
  const rows = await queryRows(
    `
      insert into public.free_questions (nickname, question_text, author_token)
      values ($1, $2, $3)
      returning ${QUESTION_COLUMNS}
    `,
    [nickname, questionText, authorToken],
  )

  res.status(200).json({ question: readQuestionRows(rows)[0] ?? null })
}

async function updateQuestion(req: ApiRequest, res: ApiResponse) {
  const body = parseBodyObject(req.body)
  const id = parseUuid(body.id, 'id')
  const questionText = parseQuestionText(body.questionText)
  await queryRows(
    `
      update public.free_questions
      set question_text = $1
      where id = $2
    `,
    [questionText, id],
  )

  res.status(200).json({ ok: true })
}

async function deleteQuestion(req: ApiRequest, res: ApiResponse) {
  const id = parseUuid(firstQueryValue(req.query.id), 'id')
  await queryRows(
    `
      delete from public.free_questions
      where id = $1
    `,
    [id],
  )

  res.status(200).json({ ok: true })
}
