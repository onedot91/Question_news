import { useCallback, useEffect, useState } from 'react'
import {
  deleteQuestion as deleteQuestionRequest,
  loadAdminQuestions,
  resetAllRecords as resetAllRecordsRequest,
  updateQuestion,
} from '../lib/api'
import type { Question } from '../lib/data'
import { playSound } from '../lib/sound'
import { QUESTION_MAX_LENGTH, validateQuestionText } from '../lib/validation'
import { DownloadPanel } from './DownloadPanel'

interface AdminPageProps {
  readonly onExit: () => void
}

type FilterMode = 'all' | 'pending'

function formatCreatedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function AdminPage({ onExit }: AdminPageProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<FilterMode>('all')
  const [loading, setLoading] = useState(true)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetSaving, setResetSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadQuestions = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const { questions: loadedQuestions } = await loadAdminQuestions()
      setQuestions(loadedQuestions)
      setDrafts(
        loadedQuestions.reduce<Record<string, string>>((acc, question) => {
          acc[question.id] = question.question_text
          return acc
        }, {}),
      )
      setError(null)
    } catch (error) {
      if (error instanceof Error) {
        setError('질문 목록을 불러오지 못했어요. 서버 설정을 확인해 주세요.')
        return
      }

      throw error
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  async function saveQuestion(question: Question) {
    const nextText = drafts[question.id]?.trim() ?? ''
    const validationMessage = validateQuestionText(nextText)

    if (validationMessage) {
      playSound('error')
      setMessage(validationMessage)
      return
    }

    try {
      await updateQuestion(question.id, nextText)
      playSound('save')
      setMessage(`${question.nickname}의 질문 수정 완료`)
      await loadQuestions(false)
    } catch (error) {
      if (error instanceof Error) {
        playSound('error')
        setMessage('수정하지 못했습니다. 다시 시도해 주세요.')
        return
      }

      throw error
    }
  }

  async function deleteQuestion(question: Question) {
    try {
      await deleteQuestionRequest(question.id)
      playSound('delete')
      setMessage(`${question.nickname}의 질문 삭제 완료`)
      await loadQuestions(false)
    } catch (error) {
      if (error instanceof Error) {
        playSound('error')
        setMessage('삭제하지 못했습니다. 다시 시도해 주세요.')
        return
      }

      throw error
    }
  }

  async function resetAllRecords() {
    setResetSaving(true)

    try {
      await resetAllRecordsRequest()
      playSound('delete')
      setMessage('모든 질문을 초기화했습니다.')
      setResetConfirmOpen(false)
      await loadQuestions()
    } catch (error) {
      if (error instanceof Error) {
        playSound('error')
        setMessage('초기화하지 못했습니다. 서버 설정을 확인해 주세요.')
        return
      }

      throw error
    } finally {
      setResetSaving(false)
    }
  }

  const visibleQuestions =
    filter === 'pending' ? questions.filter((question) => question.downloaded_at === null) : questions

  return (
    <main className="page admin-page">
      <header className="top-bar">
        <div className="admin-header-title">
          <h1>질문 모음</h1>
        </div>
        <button className="secondary-button admin-exit-button" type="button" onClick={onExit}>
          나가기
        </button>
      </header>

      {error && <p className="notice error">{error}</p>}
      {message && <p className="notice success">{message}</p>}

      <section className="admin-toolbar">
        <div className="segmented" aria-label="질문 보기 선택">
          {(
            [
              ['all', `전체 ${questions.length}`],
              ['pending', `누적 대기 ${questions.filter((question) => question.downloaded_at === null).length}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              type="button"
              onClick={() => {
                playSound('tap')
                setFilter(value)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="admin-toolbar-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              playSound('tap')
              loadQuestions()
            }}
          >
            새로고침
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => {
              playSound('tap')
              setResetConfirmOpen(true)
            }}
          >
            초기화
          </button>
        </div>
      </section>

      <DownloadPanel questions={questions} onStatusChange={() => loadQuestions(false)} />

      {loading ? (
        <p className="notice pulse">불러오는 중</p>
      ) : visibleQuestions.length > 0 ? (
        <section className="admin-list free-admin-list">
          {visibleQuestions.map((question) => (
            <article className="admin-question-card" key={question.id}>
              <div className="admin-question-content">
                <div className="admin-question-meta">
                  <strong>{question.nickname}</strong>
                  <span>{formatCreatedAt(question.created_at)}</span>
                  <span className={`download-status ${question.downloaded_at ? 'done' : 'pending'}`}>
                    {question.downloaded_at ? '누적 완료' : '누적 대기'}
                  </span>
                </div>
                <div className="admin-question-edit">
                  <input
                    className="admin-question-input"
                    value={drafts[question.id] ?? question.question_text}
                    maxLength={QUESTION_MAX_LENGTH}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [question.id]: event.target.value }))
                    }
                    onBlur={() => {
                      if ((drafts[question.id] ?? question.question_text) !== question.question_text) {
                        void saveQuestion(question)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur()
                      }
                    }}
                    aria-label={`${question.nickname}의 질문`}
                  />
                  <div className="small-actions">
                    <button
                      className="danger icon-button"
                      type="button"
                      onClick={() => deleteQuestion(question)}
                      aria-label={`${question.nickname}의 질문 삭제`}
                      title="삭제"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                        <path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" />
                        <path d="M6 9h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p className="notice">아직 들어온 질문이 없어요.</p>
      )}

      {resetConfirmOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
            <div className="modal-head">
              <h2 id="reset-modal-title">정말 초기화시키겠습니까?</h2>
              <button
                className="secondary-button"
                type="button"
                disabled={resetSaving}
                onClick={() => setResetConfirmOpen(false)}
              >
                닫기
              </button>
            </div>
            <p>지금까지 들어온 모든 질문이 삭제됩니다.</p>
            <p className="confirm-warning">이 작업은 되돌릴 수 없습니다.</p>
            <div className="confirm-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={resetSaving}
                onClick={() => setResetConfirmOpen(false)}
              >
                취소
              </button>
              <button className="danger-button" type="button" disabled={resetSaving} onClick={resetAllRecords}>
                {resetSaving ? '초기화 중' : '모든 질문 초기화'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
