import {
  firstQueryValue,
  parseWeekKey,
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
    const weekKeys = parseWeekKeys(firstQueryValue(req.query.weekKeys))
    const rows = await sql().query(
      `
        select week_key
        from public.weekly_topics
        where week_key = any($1)
      `,
      [weekKeys],
    )

    res.status(200).json({
      weekKeys: rows.map((row) => parseWeekKey(row.week_key)),
    })
  } catch (error) {
    sendError(res, error)
  }
}

function parseWeekKeys(value: string | null): string[] {
  if (!value) {
    return []
  }

  return value.split(',').map(parseWeekKey)
}
