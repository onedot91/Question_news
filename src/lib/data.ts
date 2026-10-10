export type DownloadKind = 'cumulative' | 'full'

export interface Question {
  id: string
  nickname: string
  question_text: string
  created_at: string
  updated_at: string
  downloaded_at: string | null
}
