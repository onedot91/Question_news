import { useCallback, useEffect, useState } from 'react'
import gomaCharacter from '../assets/goma-newspaper-character.png'
import { createQuestion, loadMyQuestions, loadPublicQuestions } from '../lib/api'
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

type QuestionView = 'all' | 'mine'

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
  // 확인된 닉네임이 있어야 질문 입력란이 열립니다. 저장된 닉네임이 올바르면 바로 엽니다.
  const [confirmedNickname, setConfirmedNickname] = useState(() =>
    validateNickname(nickname) ? '' : nickname.trim(),
  )
  const [draft, setDraft] = useState('')
  const [myQuestions, setMyQuestions] = useState<Question[]>([])
  const [publicQuestions, setPublicQuestions] = useState<Question[]>([])
  const [view, setView] = useState<QuestionView>('all')
  const [message, setMessage] = useState<string | undefined>()
  const [nicknameMessage, setNicknameMessage] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teacherClickCount, setTeacherClickCount] = useState(0)

  const loadQuestions = useCallback(async () => {
    setLoading(true)

    try {
      const [mine, everyone] = await Promise.all([loadMyQuestions(authorToken), loadPublicQuestions()])
      setMyQuestions(mine.questions)
      setPublicQuestions(everyone.questions)
      setError(null)
    } catch (error) {
      if (error instanceof Error) {
        setError('질문을 불러오지 못했어요. 잠시 뒤 다시 들어와 주세요.')
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

  function handleConfirmNickname() {
    const nextNickname = nickname.trim()
    const nicknameError = validateNickname(nextNickname)

    if (nicknameError) {
      playSound('error')
      setNicknameMessage(nicknameError)
      return
    }

    playSound('tap')
    storeNickname(nextNickname)
    setNickname(nextNickname)
    setConfirmedNickname(nextNickname)
  }

  function handleChangeNickname() {
    playSound('tap')
    setNicknameMessage(undefined)
    setConfirmedNickname('')
  }

  async function handleSave() {
    const questionText = draft.trim()
    const questionError = validateQuestionText(questionText)

    setMessage(questionError ?? undefined)

    if (questionError) {
      playSound('error')
      return
    }

    setSaving(true)

    try {
      const { question } = await createQuestion({ nickname: confirmedNickname, questionText, authorToken })
      playSound('save')
      setDraft('')
      setMessage('질문을 보냈어요!')

      if (question) {
        setMyQuestions((current) => [question, ...current])
        setPublicQuestions((current) => [question, ...current])
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

  const visibleQuestions = view === 'all' ? publicQuestions : myQuestions

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

      {confirmedNickname ? (
        <>
          <section className="nickname-summary" aria-label="닉네임">
            <span>
              <strong>{confirmedNickname}</strong>님, 궁금한 것을 질문해 보세요
            </span>
            <button className="secondary-button" type="button" onClick={handleChangeNickname}>
              닉네임 바꾸기
            </button>
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

          <section className="collection-section" aria-labelledby="question-list-title">
            <div className="collection-head">
              <h2 id="question-list-title">{view === 'all' ? '모두의 질문' : '내가 한 질문'}</h2>
              <div className="collection-tabs" aria-label="질문 목록 선택">
                {(
                  [
                    ['all', `모두 ${publicQuestions.length}`],
                    ['mine', `내 질문 ${myQuestions.length}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={view === value ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      if (view !== value) {
                        playSound('tap')
                      }
                      setView(value)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="notice error">{error}</p>}
            {loading ? (
              <p className="notice pulse">불러오는 중</p>
            ) : visibleQuestions.length > 0 ? (
              <div className="shared-grid">
                {visibleQuestions.map((question) => (
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
        </>
      ) : (
        <form
          className="nickname-panel"
          aria-label="닉네임 입력"
          onSubmit={(event) => {
            event.preventDefault()
            handleConfirmNickname()
          }}
        >
          <label className="nickname-field">
            <span>먼저 닉네임을 정해 주세요</span>
            <input
              value={nickname}
              maxLength={NICKNAME_MAX_LENGTH}
              onChange={(event) => {
                setNickname(event.target.value)
                setNicknameMessage(undefined)
              }}
              placeholder="예: 궁금이"
              autoComplete="nickname"
              autoFocus
            />
          </label>
          {nicknameMessage && <span className="helper-text">{nicknameMessage}</span>}
          <button className="primary-button" type="submit">
            다음
          </button>
        </form>
      )}
    </main>
  )
}
