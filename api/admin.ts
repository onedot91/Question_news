import {
  firstQueryValue,
  parseWeekKey,
  readQuestionRows,
  readWeeklyTopicOrNull,
  sendError,
  sendMethodNotAllowed,
  sql,
  type ApiRequest,
  type ApiResponse,
} from './_shared'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET'])
    return
  }

  try {
    const weekKey = parseWeekKey(firstQueryValue(req.query.weekKey))
    const [questionsRows, topicRows] = await Promise.all([
      sql.query(
        `
          select *
          from public.questions
          where week_key = $1
          order by student_number asc
        `,
        [weekKey],
      ),
      sql.query(
        `
          select *
          from public.weekly_topics
          where week_key = $1
          limit 1
        `,
        [weekKey],
      ),
    ])

    res.status(200).json({
      questions: readQuestionRows(questionsRows),
      weeklyTopic: readWeeklyTopicOrNull(topicRows),
    })
  } catch (error) {
    sendError(res, error)
  }
}
