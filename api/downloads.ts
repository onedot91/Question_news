import {
  parseBodyObject,
  parseDownloadMode,
  parseWeekKey,
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
    const body = parseBodyObject(req.body)
    const weekKey = parseWeekKey(body.weekKey)
    const mode = parseDownloadMode(body.mode)
    const rows = await queryRows(
      `
        with claimed as (
          update public.questions
          set downloaded_at = now()
          where week_key = $1
            and downloaded_at is null
            and ($2 = 'all' or question_type = $2)
          returning *
        )
        select *
        from claimed
        order by student_number asc, question_type asc
      `,
      [weekKey, mode],
    )

    res.status(200).json({ questions: readQuestionRows(rows) })
  } catch (error) {
    sendError(res, error)
  }
}
