import { useCallback, useEffect, useState } from 'react'
import gomaCharacter from '../assets/goma-newspaper-character.png'
import { createQuestion, loadMyQuestions } from '../lib/api'
import type { Question } from '../lib/data'
import { playSound } from '../lib/sound'
import { NICKNAME_MAX_LENGTH, validateNickname, validateQuestionText } from '../lib/validation'
import { QuestionCard } from './QuestionCard'

interface QuestionPageProps {
  readonly authorToken: string
  readonly onTeacherReveal: () => void
}

const NICKNAME_STORAGE_KEY = 'question-news-nickname'
const TEACHER_REVEAL_CLICKS = 5

function readStoredNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function storeNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_STORAGE_KEY, nickname)
  } catch {
    // 저장소를 쓸 수 없는 브라우저에서는 매번 닉네임을 다시 씁니다.
  }
}

function formatCreatedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function QuestionPage({ authorToken, onTeacherReveal }: QuestionPageProps) {
  const [nickname, setNickname] = useState(readStoredNickname)
  const [draft, setDraft] = useState('')
  const [myQuestions, setMyQuestions] = useState<Question[]>([])
  const [message, setMessage] = useState<string | undefined>()
  const [nicknameMessage, setNicknameMessage] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teacherClickCount, setTeacherClickCount] = useState(0)

  const loadQuestions = useCallback(async () => {
    setLoading(true)

    try {
      const { questions } = await loadMyQuestions(authorToken)
      setMyQuestions(questions)
      setError(null)
    } catch (error) {
      if (error instanceof Error) {
        setError('내 질문을 불러오지 못했어요. 잠시 뒤 다시 들어와 주세요.')
        return
      }

      throw error
    } finally {
      setLoading(false)
    }
  }, [authorToken])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  function handleTeacherReveal() {
    const nextCount = teacherClickCount + 1

    if (nextCount >= TEACHER_REVEAL_CLICKS) {
      setTeacherClickCount(0)
      onTeacherReveal()
      return
    }

    setTeacherClickCount(nextCount)
  }

  async function handleSave() {
    const nextNickname = nickname.trim()
    const questionText = draft.trim()
    const nicknameError = validateNickname(nextNickname)
    const questionError = validateQuestionText(questionText)

    setNicknameMessage(nicknameError ?? undefined)
    setMessage(questionError ?? undefined)

    if (nicknameError || questionError) {
      playSound('error')
      return
    }

    setSaving(true)

    try {
      const { question } = await createQuestion({ nickname: nextNickname, questionText, authorToken })
      playSound('save')
      storeNickname(nextNickname)
      setDraft('')
      setMessage('질문을 보냈어요!')

      if (question) {
        setMyQuestions((current) => [question, ...current])
      }
    } catch (error) {
      if (error instanceof Error) {
        playSound('error')
        setMessage('보내지 못했어요. 다시 눌러 주세요.')
        return
      }

      throw error
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page student-page free-question-page">
      <button
        className="teacher-reveal-button"
        type="button"
        aria-label="선생님 화면"
        onClick={handleTeacherReveal}
      />
      <section className="intro">
        <div>
          <p className="eyebrow">질문하기</p>
          <h1>
            <span>무엇이든</span> 질문
          </h1>
        </div>
        <div className="intro-scene" aria-hidden="true">
          <img className="intro-character" src={gomaCharacter} alt="" />
        </div>
      </section>

      <section className="nickname-panel" aria-label="닉네임">
        <label className="nickname-field">
          <span>닉네임</span>
          <input
            value={nickname}
            maxLength={NICKNAME_MAX_LENGTH}
            onChange={(event) => {
              setNickname(event.target.value)
              setNicknameMessage(undefined)
            }}
            placeholder="예: 궁금이"
            autoComplete="nickname"
          />
        </label>
        {nicknameMessage && <span className="helper-text">{nicknameMessage}</span>}
      </section>

      <section className="student-card-grid single" aria-label="질문 쓰기">
        <QuestionCard
          id="free"
          label="질문"
          value={draft}
          isSaving={saving}
          isFilled={Boolean(draft.trim())}
          isSaved={false}
          message={message}
          placeholder="평소 궁금한 내용을 질문해요"
          onChange={(value) => {
            setDraft(value)
            setMessage(undefined)
          }}
          onSave={handleSave}
        />
      </section>

      <section className="collection-section" aria-labelledby="my-questions-title">
        <div className="collection-head">
          <h2 id="my-questions-title">내가 한 질문 {myQuestions.length > 0 && myQuestions.length}</h2>
        </div>

        {error && <p className="notice error">{error}</p>}
        {loading ? (
          <p className="notice pulse">불러오는 중</p>
        ) : myQuestions.length > 0 ? (
          <div className="shared-grid">
            {myQuestions.map((question) => (
              <article className="shared-card" key={question.id}>
                <div>
                  <strong>{question.nickname}</strong>
                  <span>{formatCreatedAt(question.created_at)}</span>
                </div>
                <p>{question.question_text}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="notice">아직 없어요. 첫 질문을 보내 보세요!</p>
        )}
      </section>
    </main>
  )
}
