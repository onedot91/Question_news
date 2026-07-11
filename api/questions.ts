import {
  firstQueryValue,
  parseBodyObject,
  parseId,
  parseQuestionText,
  parseQuestionType,
  parseStudentNumber,
  parseWeekKey,
  queryRows,
  readQuestionRows,
  sendError,
  sendMethodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from './_shared'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    if (req.method === 'POST') {
      await saveQuestion(req, res)
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

    sendMethodNotAllowed(res, ['POST', 'PATCH', 'DELETE'])
  } catch (error) {
    sendError(res, error)
  }
}

async function saveQuestion(req: ApiRequest, res: ApiResponse) {
  const body = parseBodyObject(req.body)
  const studentNumber = parseStudentNumber(body.studentNumber)
  const questionType = parseQuestionType(body.questionType)
  const questionText = parseQuestionText(body.questionText)
  const weekKey = parseWeekKey(body.weekKey)
  const rows = await queryRows(
    `
      insert into public.questions (student_number, question_type, question_text, week_key)
      values ($1, $2, $3, $4)
      on conflict (student_number, question_type, week_key)
      do update set question_text = excluded.question_text, updated_at = now()
      returning *
    `,
    [studentNumber, questionType, questionText, weekKey],
  )

  res.status(200).json({ question: readQuestionRows(rows)[0] ?? null })
}

async function updateQuestion(req: ApiRequest, res: ApiResponse) {
  const body = parseBodyObject(req.body)
  const id = parseId(body.id)
  const questionText = parseQuestionText(body.questionText)
  await queryRows(
    `
      update public.questions
      set question_text = $1, updated_at = now()
      where id = $2
    `,
    [questionText, id],
  )

  res.status(200).json({ ok: true })
}

async function deleteQuestion(req: ApiRequest, res: ApiResponse) {
  const id = parseId(firstQueryValue(req.query.id))
  await queryRows(
    `
      delete from public.questions
      where id = $1
    `,
    [id],
  )

  res.status(200).json({ ok: true })
}
