import type { DownloadKind, Question } from './data'

const GOMA_HEADER = '[$goma-newspaper](/Users/ibyeonghyeon/.codex/skills/goma-newspaper/SKILL.md)'

function sortByCreatedAt(questions: readonly Question[]): Question[] {
  return [...questions].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function selectQuestionsForDownload(questions: readonly Question[], kind: DownloadKind): Question[] {
  return questions.filter((question) => kind === 'full' || question.downloaded_at === null)
}

export function buildTxtContent(questions: readonly Question[]): string {
  const lines = sortByCreatedAt(questions).map(
    (question, index) => `${index + 1}. ${question.question_text.trim()} (${question.nickname.trim()})`,
  )

  return [GOMA_HEADER, '', ...lines].join('\n')
}

export function downloadTxt(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function todayLabel(date = new Date()): string {
  const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)

  return koreaDate.toISOString().slice(0, 10)
}
