import { queryRows, sendError, sendMethodNotAllowed, type ApiRequest, type ApiResponse } from './_shared.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'DELETE') {
    sendMethodNotAllowed(res, ['DELETE'])
    return
  }

  try {
    await queryRows('delete from public.weekly_topics')
    await queryRows('delete from public.questions')
    res.status(200).json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
}
