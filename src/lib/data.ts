export type QuestionType = 'personal' | 'topic'
export type DownloadMode = QuestionType | 'all'
export type DownloadKind = 'cumulative' | 'full'

export interface Question {
  id: string
  student_number: number
  question_type: QuestionType
  question_text: string
  week_key: string
  created_at: string
  updated_at: string
  downloaded_at: string | null
}

export interface WeeklyTopic {
  id: string
  week_key: string
  topic_text: string
  created_at: string
  updated_at: string
}
