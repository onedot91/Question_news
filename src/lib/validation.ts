export const QUESTION_MAX_LENGTH = 60
const BANNED_WORDS = ['야르', '67']
const ALLOWED_QUESTION_CHARACTERS = /^[\p{L}\p{N}\s?？]+$/u

export function validateQuestionText(text: string): string | null {
  const trimmed = text.trim()

  if (!trimmed) {
    return '질문을 써 주세요.'
  }

  if (trimmed.length > QUESTION_MAX_LENGTH) {
    return `${QUESTION_MAX_LENGTH}자 안으로 줄여 주세요.`
  }

  if (BANNED_WORDS.some((word) => trimmed.includes(word))) {
    return '쓸 수 없는 말이 들어 있어요.'
  }

  if (!/\s/.test(trimmed)) {
    return '띄어쓰기를 한 번 이상 해 주세요.'
  }

  if (!ALLOWED_QUESTION_CHARACTERS.test(trimmed)) {
    return '특수문자는 물음표만 쓸 수 있어요.'
  }

  if (!/^[^?？]+[?？]$/.test(trimmed)) {
    return '물음표 하나로 끝내 주세요.'
  }

  return null
}
