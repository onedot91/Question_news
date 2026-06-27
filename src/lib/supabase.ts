import { createClient } from '@supabase/supabase-js'

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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? '.env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣어 주세요.'
    : null

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl!, supabaseAnonKey!)
