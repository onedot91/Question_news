// 브라우저와 서버(api)가 함께 쓰는 검사 규칙입니다.
export const QUESTION_MAX_LENGTH = 60
export const NICKNAME_MAX_LENGTH = 12
const BANNED_WORDS = ['야르', '67'] as const
const ALLOWED_QUESTION_CHARACTERS = /^[\p{L}\p{N}\s?？]+$/u
const ALLOWED_NICKNAME_CHARACTERS = /^[\p{L}\p{N} ]+$/u

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

export function validateNickname(nickname: string): string | null {
  const trimmed = nickname.trim()

  if (!trimmed) {
    return '닉네임을 써 주세요.'
  }

  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return `닉네임은 ${NICKNAME_MAX_LENGTH}자 안으로 써 주세요.`
  }

  if (BANNED_WORDS.some((word) => trimmed.includes(word))) {
    return '닉네임에 쓸 수 없는 말이 들어 있어요.'
  }

  if (!ALLOWED_NICKNAME_CHARACTERS.test(trimmed)) {
    return '닉네임은 글자와 숫자만 쓸 수 있어요.'
  }

  return null
}
