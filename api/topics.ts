import {
  parseBodyObject,
  parseTopicText,
  parseWeekKey,
  queryRows,
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
    const topicText = parseTopicText(body.topicText)
    await queryRows(
      `
        insert into public.weekly_topics (week_key, topic_text)
        values ($1, $2)
        on conflict (week_key)
        do update set topic_text = excluded.topic_text, updated_at = now()
      `,
      [weekKey, topicText],
    )

    res.status(200).json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
}
