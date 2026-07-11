import { sendError, sendMethodNotAllowed, sql, type ApiRequest, type ApiResponse } from './_shared'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'DELETE') {
    sendMethodNotAllowed(res, ['DELETE'])
    return
  }

  try {
    const db = sql()
    await db.query('delete from public.weekly_topics')
    await db.query('delete from public.questions')
    res.status(200).json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
}
