import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteQuestion as deleteQuestionRequest,
  loadAdminData,
  loadTopicWeekKeys as loadTopicWeekKeysRequest,
  resetAllRecords as resetAllRecordsRequest,
  saveWeeklyTopic as saveWeeklyTopicRequest,
  updateQuestion,
} from '../lib/api'
import type { Question, QuestionType } from '../lib/data'
import { buildTxtContent, downloadTxt } from '../lib/download'
import { playSound } from '../lib/sound'
import { validateQuestionText } from '../lib/validation'
import { buildWeekOptions, getCurrentWeekKey } from '../lib/week'

type QuestionMap = Record<number, Partial<Record<QuestionType, Question>>>
type FilterMode = 'all' | QuestionType

const questionTypes: QuestionType[] = ['personal', 'topic']
const labels: Record<QuestionType, string> = {
  personal: '개인 질문',
  topic: '주제 질문',
}

export function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [topicDraft, setTopicDraft] = useState('')
  const [topicWeekKeys, setTopicWeekKeys] = useState<Set<string>>(() => new Set())
  const [filter, setFilter] = useState<FilterMode>('all')
  const [loading, setLoading] = useState(true)
  const [topicSaving, setTopicSaving] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetSaving, setResetSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), [])
  const weekOptions = useMemo(() => buildWeekOptions(8), [])
  const [weekKey, setWeekKey] = useState(() => currentWeekKey)

  const loadTopicWeekKeys = useCallback(async () => {
    const weekKeys = weekOptions.map((option) => option.weekKey)

    try {
      const { weekKeys: loadedWeekKeys } = await loadTopicWeekKeysRequest(weekKeys)
      setTopicWeekKeys(new Set(loadedWeekKeys))
    } catch (error) {
      if (error instanceof Error) {
        setError('주제 작성 현황을 불러오지 못했어요. 서버 설정을 확인해 주세요.')
        return
      }

      throw error
    }
  }, [weekOptions])

  const loadQuestions = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const { questions: loadedQuestions, weeklyTopic } = await loadAdminData(weekKey)
      setQuestions(loadedQuestions)
      setTopicDraft(weeklyTopic?.topic_text ?? '')
      setDrafts(
        loadedQuestions.reduce<Record<string, string>>((acc, question) => {
          acc[question.id] = question.question_text
          return acc
        }, {}),
      )
      setMessage('')
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
  }, [weekKey])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    loadTopicWeekKeys()
  }, [loadTopicWeekKeys])

  const questionMap = useMemo(() => {
    return questions.reduce<QuestionMap>((acc, question) => {
      acc[question.student_number] ??= {}
      acc[question.student_number][question.question_type] = question
      return acc
    }, {})
  }, [questions])

  const studentStatuses = useMemo(() => {
    return Array.from({ length: 23 }, (_, index) => {
      const studentNumber = index + 1
      const personal = Boolean(questionMap[studentNumber]?.personal)
      const topic = Boolean(questionMap[studentNumber]?.topic)

      return {
        studentNumber,
        personal,
        topic,
        personalComplete: personal,
      }
    })
  }, [questionMap])

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
      setMessage(`${question.student_number}번 수정 완료`)
      await loadQuestions()
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
    const scrollY = window.scrollY

    try {
      await deleteQuestionRequest(question.id)
      playSound('delete')
      setMessage(`${question.student_number}번 삭제 완료`)
      await loadQuestions(false)
      requestAnimationFrame(() => window.scrollTo({ top: scrollY }))
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
      setMessage('모든 기록을 초기화했습니다.')
      setResetConfirmOpen(false)
      await loadTopicWeekKeys()
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

  function handleDownload(mode: FilterMode) {
    playSound('download')
    const filename =
      mode === 'all' ? `전체질문-${weekKey}.txt` : `${labels[mode].replace(' ', '')}-${weekKey}.txt`
    downloadTxt(filename, buildTxtContent(questions, mode))
  }

  function shouldShowType(type: QuestionType) {
    return filter === 'all' || filter === type
  }

  function formatTopicWeekOption(option: { weekKey: string; label: string }) {
    const statusMark = topicWeekKeys.has(option.weekKey) ? '●' : '○'
    const todayText = option.weekKey === currentWeekKey ? ' · 오늘' : ''

    return `${statusMark} ${option.label}${todayText}`
  }

  async function saveWeeklyTopic() {
    const topicText = topicDraft.trim()

    if (!topicText) {
      playSound('error')
      setMessage('주제를 써 주세요.')
      return
    }

    setTopicSaving(true)

    try {
      await saveWeeklyTopicRequest(weekKey, topicText)
      playSound('save')
      setMessage('주제 저장 완료')
      await loadTopicWeekKeys()
      await loadQuestions()
    } catch (error) {
      if (error instanceof Error) {
        playSound('error')
        setMessage('주제를 저장하지 못했습니다.')
        return
      }

      throw error
    } finally {
      setTopicSaving(false)
    }
  }

  return (
    <main className="page admin-page">
      <header className="top-bar">
        <div className="admin-header-title">
          <h1>질문 현황</h1>
        </div>
        <section className="topic-admin-panel" aria-label="주제 설정">
          <div className="topic-admin-fields">
            <label className="topic-date-field">
              <span className="topic-field-heading">
                <span>적용 주</span>
                <span className="topic-status-legend" aria-label="검은 동그라미는 주제 있음, 빈 동그라미는 미작성">
                  ● 있음 · ○ 없음
                </span>
              </span>
              <select value={weekKey} onChange={(event) => setWeekKey(event.target.value)} aria-label="주제 적용 주">
                {weekOptions.map((option) => (
                  <option key={option.weekKey} value={option.weekKey}>
                    {formatTopicWeekOption(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="topic-text-field">
              <span>주제</span>
              <input
                value={topicDraft}
                maxLength={40}
                onChange={(event) => setTopicDraft(event.target.value)}
                placeholder="예: 우리 동네"
              />
            </label>
            <button className="primary-button" type="button" disabled={topicSaving} onClick={saveWeeklyTopic}>
              {topicSaving ? '저장 중' : '주제 저장'}
            </button>
          </div>
        </section>
      </header>

      {error && <p className="notice error">{error}</p>}
      {message && <p className="notice success">{message}</p>}

      <section className="submission-overview" aria-label="학생별 질문 제출 현황">
        <div className="overview-head">
          <div className="overview-legend" aria-hidden="true">
            <span className="personal">개인</span>
            <span className="topic">주제</span>
          </div>
        </div>
        <div className="submission-grid">
          {studentStatuses.map(({ studentNumber, personal, topic, personalComplete }) => (
            <div
              className={`submission-tile ${personalComplete ? 'personal-complete' : ''} ${
                topic ? 'topic-submitted' : ''
              }`}
              key={studentNumber}
              aria-label={`${studentNumber}번 개인 질문 ${personal ? '제출' : '미제출'}, 주제 질문 ${
                topic ? '제출' : '미제출'
              }`}
              title={`${studentNumber}번 · 개인 ${personal ? '제출' : '미제출'} · 주제 ${
                topic ? '제출' : '미제출'
              }`}
            >
              <span className="submission-number">{studentNumber}</span>
              <span className="submission-dots" aria-hidden="true">
                <span className={personal ? 'personal on' : 'personal'} />
                <span className={topic ? 'topic on' : 'topic'} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-toolbar">
        <div className="segmented" aria-label="질문 보기 선택">
          {[
            ['all', '전체 보기'],
            ['personal', '개인 질문'],
            ['topic', '주제 질문'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              type="button"
              onClick={() => {
                playSound('tap')
                setFilter(value as FilterMode)
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

      <section className="download-panel">
        <p>신문 이미지용 TXT</p>
        <div className="download-actions">
          <button type="button" onClick={() => handleDownload('personal')}>
            개인 질문 TXT 다운로드
          </button>
          <button type="button" onClick={() => handleDownload('topic')}>
            주제 질문 TXT 다운로드
          </button>
          <button type="button" onClick={() => handleDownload('all')}>
            전체 질문 TXT 다운로드
          </button>
        </div>
      </section>

      {loading ? (
        <p className="notice pulse">불러오는 중</p>
      ) : (
        <section className="admin-list">
          {Array.from({ length: 23 }, (_, index) => index + 1).map((studentNumber) => (
            <article className="student-row" key={studentNumber}>
              <div className="student-number">{studentNumber}번</div>
              <div className="student-questions">
                {questionTypes.filter(shouldShowType).map((type) => {
                  const question = questionMap[studentNumber]?.[type]

                  return (
                    <div className={`admin-question-card${question ? '' : ' is-missing'}`} key={type}>
                      {question ? (
                        <div className="admin-question-edit">
                          <input
                            className="admin-question-input"
                            value={drafts[question.id] ?? question.question_text}
                            maxLength={60}
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
                            aria-label={`${studentNumber}번 ${labels[type]}`}
                          />
                          <div className="small-actions">
                            <button
                              className="danger icon-button"
                              type="button"
                              onClick={() => deleteQuestion(question)}
                              aria-label={`${studentNumber}번 ${labels[type]} 삭제`}
                              title="삭제"
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                                <path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" />
                                <path d="M6 9h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="missing-submission" aria-label={`${studentNumber}번 ${labels[type]} 미제출`}>
                          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                            <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-4 5h8v2H8v-2Z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </section>
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
            <p>모든 주차의 개인 질문, 주제 질문, 주제 기록이 전부 삭제됩니다.</p>
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
                {resetSaving ? '초기화 중' : '모든 기록 초기화'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
