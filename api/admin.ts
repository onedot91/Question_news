import {
  queryRows,
  readQuestionRows,
  sendError,
  sendMethodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'

const ADMIN_QUESTIONS_LIMIT = 2000

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET'])
    return
  }

  try {
    const rows = await queryRows(
      `
        select id, nickname, question_text, created_at, updated_at, downloaded_at
        from public.free_questions
        order by created_at desc
        limit ${ADMIN_QUESTIONS_LIMIT}
      `,
    )

    res.status(200).json({ questions: readQuestionRows(rows) })
  } catch (error) {
    sendError(res, error)
  }
}
