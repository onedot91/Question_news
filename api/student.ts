import {
  firstQueryValue,
  parseStudentNumber,
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
    const studentNumber = parseStudentNumber(firstQueryValue(req.query.studentNumber))
    const weekKey = parseWeekKey(firstQueryValue(req.query.weekKey))
    const [questionsRows, historyRows, topicRows] = await Promise.all([
      sql.query(
        `
          select *
          from public.questions
          where week_key = $1
          order by student_number asc, question_type asc
        `,
        [weekKey],
      ),
      sql.query(
        `
          select *
          from public.questions
          where student_number = $1
          order by week_key desc, question_type asc
        `,
        [studentNumber],
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
      history: readQuestionRows(historyRows),
      weeklyTopic: readWeeklyTopicOrNull(topicRows),
    })
  } catch (error) {
    sendError(res, error)
  }
}
