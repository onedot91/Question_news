export type QuestionType = 'personal' | 'topic'

export interface Question {
  id: string
  student_number: number
  question_type: QuestionType
  question_text: string
  week_key: string
  created_at: string
  updated_at: string
}

export interface WeeklyTopic {
  id: string
  week_key: string
  topic_text: string
  created_at: string
  updated_at: string
}
