import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildTxtContent, downloadTxt } from '../lib/download'
import { playSound } from '../lib/sound'
import { supabase, supabaseConfigError, type Question, type QuestionType, type WeeklyTopic } from '../lib/supabase'
import { validateQuestionText } from '../lib/validation'
import { buildWeekOptions, formatWeekKeyAsKoreanMonthWeek, getCurrentWeekKey } from '../lib/week'

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
  const [filter, setFilter] = useState<FilterMode>('all')
  const [loading, setLoading] = useState(true)
  const [topicSaving, setTopicSaving] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetSaving, setResetSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(supabaseConfigError)
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), [])
  const weekOptions = useMemo(() => buildWeekOptions(16), [])
  const [weekKey, setWeekKey] = useState(() => currentWeekKey)

  const loadQuestions = useCallback(async (showLoading = true) => {
    if (!supabase) {
      setLoading(false)
      return
    }

    if (showLoading) {
      setLoading(true)
    }
    const [questionsResult, topicResult] = await Promise.all([
      supabase.from('questions').select('*').eq('week_key', weekKey).order('student_number', { ascending: true }),
      supabase.from('weekly_topics').select('*').eq('week_key', weekKey).maybeSingle(),
    ])

    if (questionsResult.error || topicResult.error) {
      setError('질문 목록을 불러오지 못했어요. Supabase 설정을 확인해 주세요.')
    } else {
      const loaded = (questionsResult.data as Question[] | null) ?? []
      const topic = (topicResult.data as WeeklyTopic | null) ?? null
      setQuestions(loaded)
      setTopicDraft(topic?.topic_text ?? '')
      setDrafts(
        loaded.reduce<Record<string, string>>((acc, question) => {
          acc[question.id] = question.question_text
          return acc
        }, {}),
      )
      setMessage('')
      setError(null)
    }

    if (showLoading) {
      setLoading(false)
    }
  }, [weekKey])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

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

    if (!supabase) {
      playSound('error')
      setError(supabaseConfigError)
      return
    }

    const { error: updateError } = await supabase
      .from('questions')
      .update({ question_text: nextText, updated_at: new Date().toISOString() })
      .eq('id', question.id)

    if (updateError) {
      playSound('error')
      setMessage('수정하지 못했습니다. 다시 시도해 주세요.')
    } else {
      playSound('save')
      setMessage(`${question.student_number}번 수정 완료`)
      await loadQuestions()
    }
  }

  async function deleteQuestion(question: Question) {
    if (!supabase) {
      playSound('error')
      setError(supabaseConfigError)
      return
    }

    const scrollY = window.scrollY
    const { error: deleteError } = await supabase.from('questions').delete().eq('id', question.id)

    if (deleteError) {
      playSound('error')
      setMessage('삭제하지 못했습니다. 다시 시도해 주세요.')
    } else {
      playSound('delete')
      setMessage(`${question.student_number}번 삭제 완료`)
      await loadQuestions(false)
      requestAnimationFrame(() => window.scrollTo({ top: scrollY }))
    }
  }

  async function resetAllRecords() {
    if (!supabase) {
      playSound('error')
      setError(supabaseConfigError)
      return
    }

    setResetSaving(true)
    const topicsResult = await supabase.from('weekly_topics').delete().not('id', 'is', null)

    if (topicsResult.error) {
      playSound('error')
      setMessage('초기화하지 못했습니다. 주제 삭제 권한을 확인해 주세요.')
      setResetSaving(false)
      return
    }

    const questionsResult = await supabase.from('questions').delete().not('id', 'is', null)

    if (questionsResult.error) {
      playSound('error')
      setMessage('초기화하지 못했습니다. 질문 삭제 권한을 확인해 주세요.')
    } else {
      playSound('delete')
      setMessage('모든 기록을 초기화했습니다.')
      setResetConfirmOpen(false)
      await loadQuestions()
    }

    setResetSaving(false)
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

  async function saveWeeklyTopic() {
    const topicText = topicDraft.trim()

    if (!topicText) {
      playSound('error')
      setMessage('주제를 써 주세요.')
      return
    }

    if (!supabase) {
      playSound('error')
      setError(supabaseConfigError)
      return
    }

    setTopicSaving(true)
    const { error: topicError } = await supabase.from('weekly_topics').upsert(
      {
        week_key: weekKey,
        topic_text: topicText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'week_key' },
    )

    if (topicError) {
      playSound('error')
      setMessage('주제를 저장하지 못했습니다.')
    } else {
      playSound('save')
      setMessage('주제 저장 완료')
      await loadQuestions()
    }

    setTopicSaving(false)
  }

  return (
    <main className="page admin-page">
      <header className="top-bar">
        <div className="admin-header-title">
          <p className="eyebrow">관리자 · {formatWeekKeyAsKoreanMonthWeek(weekKey)}</p>
          <h1>질문 현황</h1>
        </div>
        <section className="topic-admin-panel" aria-label="주제 설정">
          <div className="topic-admin-fields">
            <label className="topic-date-field">
              <span>적용 주</span>
              <select value={weekKey} onChange={(event) => setWeekKey(event.target.value)} aria-label="주제 적용 주">
                {weekOptions.map((option) => (
                  <option key={option.weekKey} value={option.weekKey}>
                    {option.weekKey === currentWeekKey ? `${option.label} · 오늘` : option.label}
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
