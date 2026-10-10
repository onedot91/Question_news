import {
  queryRows,
  readQuestionRows,
  sendError,
  sendMethodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['POST'])
    return
  }

  try {
    const rows = await queryRows(
      `
        with claimed as (
          update public.free_questions
          set downloaded_at = now()
          where downloaded_at is null
          returning id, nickname, question_text, created_at, updated_at, downloaded_at
        )
        select *
        from claimed
        order by created_at asc
      `,
    )

    res.status(200).json({ questions: readQuestionRows(rows) })
  } catch (error) {
    sendError(res, error)
  }
}
