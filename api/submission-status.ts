import {
  applySchoolTimerCors,
  currentWeekKey,
  firstQueryValue,
  parseQuestionType,
  parseStudentNumber,
  parseWeekKey,
  queryRows,
  sendError,
  sendMethodNotAllowed,
  sendOptionsOk,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'

type SubmissionStatus = {
  readonly number: number
  readonly personalSubmitted: boolean
  readonly topicSubmitted: boolean
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  applySchoolTimerCors(res)

  if (req.method === 'OPTIONS') {
    sendOptionsOk(res)
    return
  }

  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET', 'OPTIONS'])
    return
  }

  try {
    const weekKey = parseRequestedWeekKey(firstQueryValue(req.query.weekKey))
    const rows = await queryRows(
      `
        select student_number, question_type
        from public.questions
        where week_key = $1
        group by student_number, question_type
        order by student_number asc, question_type asc
      `,
      [weekKey],
    )

    res.status(200).json(buildSubmissionStatuses(rows))
  } catch (error) {
    sendError(res, error)
  }
}

function parseRequestedWeekKey(value: string | null): string {
  return value ? parseWeekKey(value) : currentWeekKey()
}

function buildSubmissionStatuses(rows: readonly Record<string, unknown>[]): SubmissionStatus[] {
  const statuses = new Map<number, { personalSubmitted: boolean; topicSubmitted: boolean }>()

  for (const row of rows) {
    const studentNumber = parseStudentNumber(row.student_number)
    const questionType = parseQuestionType(row.question_type)
    const status = statuses.get(studentNumber) ?? {
      personalSubmitted: false,
      topicSubmitted: false,
    }

    if (questionType === 'personal') {
      statuses.set(studentNumber, { ...status, personalSubmitted: true })
    } else {
      statuses.set(studentNumber, { ...status, topicSubmitted: true })
    }
  }

  return Array.from({ length: 23 }, (_, index) => {
    const number = index + 1
    const status = statuses.get(number)

    return {
      number,
      personalSubmitted: status?.personalSubmitted ?? false,
      topicSubmitted: status?.topicSubmitted ?? false,
    }
  })
}
