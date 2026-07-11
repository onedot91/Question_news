import type { Question, QuestionType } from './data'

const GOMA_HEADER = '[$goma-newspaper](/Users/ibyeonghyeon/.codex/skills/goma-newspaper/SKILL.md)'

const typeLabels: Record<QuestionType, string> = {
  personal: '개인 질문',
  topic: '주제 질문',
}

function sortQuestions(questions: Question[]): Question[] {
  return [...questions].sort((a, b) => a.student_number - b.student_number)
}

function studentNumberedLines(questions: Question[]): string[] {
  return sortQuestions(questions).map(
    (question) => `${question.student_number}. ${question.question_text.trim()}`,
  )
}

function sequenceNumberedLines(questions: Question[]): string[] {
  return sortQuestions(questions).map((question, index) => `${index + 1}. ${question.question_text.trim()}`)
}

export function buildTxtContent(questions: Question[], mode: QuestionType | 'all'): string {
  if (mode === 'personal') {
    return [GOMA_HEADER, '', ...studentNumberedLines(questions.filter((q) => q.question_type === mode))].join('\n')
  }

  if (mode === 'topic') {
    return [GOMA_HEADER, '', ...sequenceNumberedLines(questions.filter((q) => q.question_type === mode))].join('\n')
  }

  const personal = studentNumberedLines(questions.filter((q) => q.question_type === 'personal'))
  const topic = sequenceNumberedLines(questions.filter((q) => q.question_type === 'topic'))

  return [GOMA_HEADER, '', `[${typeLabels.personal}]`, ...personal, `[${typeLabels.topic}]`, ...topic].join(
    '\n',
  )
}

export function downloadTxt(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
