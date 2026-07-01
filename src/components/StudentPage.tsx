import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playSound } from '../lib/sound'
import { formatWeekKeyAsKoreanMonthWeek, getCurrentWeekKey } from '../lib/week'
import { validateQuestionText } from '../lib/validation'
import { QuestionCard } from './QuestionCard'
import { supabase, supabaseConfigError, type Question, type QuestionType, type WeeklyTopic } from '../lib/supabase'

interface StudentPageProps {
  studentNumber: number
}

type QuestionDrafts = Record<QuestionType, string>
type StatusMessages = Partial<Record<QuestionType, string>>
type HistoryWeek = {
  weekKey: string
  questions: Partial<Record<QuestionType, Question>>
}

const labels: Record<QuestionType, string> = {
  personal: '개인 질문',
  topic: '주제 질문',
}

const collectionCardMinWidth = 230
const collectionGridGap = 12
const collectionRowHeight = 124
const collectionOverscanRows = 12

interface CollectionWindow {
  columnCount: number
  startRow: number
  endRow: number
}

export function StudentPage({ studentNumber }: StudentPageProps) {
  const collectionGridRef = useRef<HTMLDivElement>(null)
  const [drafts, setDrafts] = useState<QuestionDrafts>({ personal: '', topic: '' })
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [myQuestions, setMyQuestions] = useState<Question[]>([])
  const [weeklyTopic, setWeeklyTopic] = useState<WeeklyTopic | null>(null)
  const [collectionType, setCollectionType] = useState<QuestionType>('personal')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [messages, setMessages] = useState<StatusMessages>({})
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<QuestionType | null>(null)
  const [error, setError] = useState<string | null>(supabaseConfigError)
  const [weekKey, setWeekKey] = useState(() => getCurrentWeekKey())

  const loadQuestions = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [questionsResult, historyResult, topicResult] = await Promise.all([
      supabase
        .from('questions')
        .select('*')
        .eq('week_key', weekKey)
        .order('student_number', { ascending: true })
        .order('question_type', { ascending: true }),
      supabase
        .from('questions')
        .select('*')
        .eq('student_number', studentNumber)
        .order('week_key', { ascending: false })
        .order('question_type', { ascending: true }),
      supabase.from('weekly_topics').select('*').eq('week_key', weekKey).maybeSingle(),
    ])

    if (questionsResult.error || historyResult.error || topicResult.error) {
      setError('질문을 불러오지 못했어요. 선생님께 알려 주세요.')
    } else {
      const loaded = (questionsResult.data as Question[] | null) ?? []
      const loadedHistory = (historyResult.data as Question[] | null) ?? []
      const nextDrafts: QuestionDrafts = { personal: '', topic: '' }
      const currentStudentQuestions = [
        ...loadedHistory.filter((question) => question.week_key === weekKey),
        ...loaded.filter((question) => question.student_number === studentNumber),
      ]

      currentStudentQuestions.forEach((question) => {
        nextDrafts[question.question_type] = question.question_text
      })

      setAllQuestions(loaded)
      setMyQuestions(loadedHistory)
      setWeeklyTopic((topicResult.data as WeeklyTopic | null) ?? null)
      setDrafts(nextDrafts)
      setError(null)
    }

    setLoading(false)
  }, [studentNumber, weekKey])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWeekKey((currentWeekKey) => {
        const nextWeekKey = getCurrentWeekKey()
        return currentWeekKey === nextWeekKey ? currentWeekKey : nextWeekKey
      })
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [])

  function handleChange(type: QuestionType, value: string) {
    setDrafts((current) => ({ ...current, [type]: value }))
    setMessages((current) => ({ ...current, [type]: undefined }))
  }

  function handleSelectCollection(type: QuestionType) {
    setCollectionType((current) => {
      if (current !== type) {
        playSound('tap')
      }
      return type
    })
  }

  async function handleSave(type: QuestionType) {
    const questionText = drafts[type].trim()
    const validationMessage = validateQuestionText(questionText)

    if (type === 'topic' && !weeklyTopic) {
      playSound('error')
      setMessages((current) => ({ ...current, topic: '주제가 아직 없어요.' }))
      return
    }

    if (type === 'topic' && !drafts.personal.trim()) {
      playSound('error')
      setMessages((current) => ({ ...current, topic: '개인 질문 먼저!' }))
      return
    }

    if (validationMessage) {
      playSound('error')
      setMessages((current) => ({ ...current, [type]: validationMessage }))
      return
    }

    if (!supabase) {
      playSound('error')
      setError(supabaseConfigError)
      return
    }

    setSavingType(type)
    setMessages((current) => ({ ...current, [type]: '' }))

    const { data: savedQuestion, error: saveError } = await supabase
      .from('questions')
      .upsert(
        {
          student_number: studentNumber,
          question_type: type,
          question_text: questionText,
          week_key: weekKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_number,question_type,week_key' },
      )
      .select('*')
      .single()

    if (saveError) {
      playSound('error')
      setMessages((current) => ({ ...current, [type]: '저장하지 못했어요. 다시 눌러 주세요.' }))
    } else {
      const saved = savedQuestion as Question | null

      playSound('save')
      setDrafts((current) => ({ ...current, [type]: questionText }))
      if (saved) {
        setAllQuestions((current) => {
          const others = current.filter(
            (question) =>
              !(
                question.student_number === studentNumber &&
                question.question_type === type &&
                question.week_key === weekKey
              ),
          )
          return [...others, saved].sort((a, b) => a.student_number - b.student_number)
        })
        setMyQuestions((current) => {
          const others = current.filter(
            (question) =>
              !(
                question.student_number === studentNumber &&
                question.question_type === type &&
                question.week_key === weekKey
              ),
          )
          return [saved, ...others]
        })
      }
      setMessages((current) => ({ ...current, [type]: undefined }))
    }

    setSavingType(null)
  }

  const personalQuestions = allQuestions.filter(
    (question) => question.question_type === 'personal' && question.question_text.trim(),
  )
  const topicQuestions = allQuestions.filter(
    (question) => question.question_type === 'topic' && question.question_text.trim(),
  )
  const selectedQuestions = collectionType === 'personal' ? personalQuestions : topicQuestions
  const selectedCollectionLabel = labels[collectionType]
  const [collectionWindow, setCollectionWindow] = useState<CollectionWindow>({
    columnCount: 1,
    startRow: 0,
    endRow: 10,
  })
  const historyWeeks = useMemo<HistoryWeek[]>(() => {
    const groupedQuestions = myQuestions.reduce<Map<string, Partial<Record<QuestionType, Question>>>>(
      (groups, question) => {
        const weekQuestions = groups.get(question.week_key) ?? {}
        weekQuestions[question.question_type] = question
        groups.set(question.week_key, weekQuestions)

        return groups
      },
      new Map(),
    )

    return Array.from(groupedQuestions.entries())
      .sort(([weekA], [weekB]) => weekB.localeCompare(weekA))
      .map(([weekKey, questions]) => ({ weekKey, questions }))
  }, [myQuestions])
  const totalCollectionRows = Math.ceil(selectedQuestions.length / collectionWindow.columnCount)
  const visibleCollectionQuestions = selectedQuestions.slice(
    collectionWindow.startRow * collectionWindow.columnCount,
    collectionWindow.endRow * collectionWindow.columnCount,
  )
  const collectionTopSpacerHeight = collectionWindow.startRow * collectionRowHeight
  const collectionBottomSpacerHeight = Math.max(0, totalCollectionRows - collectionWindow.endRow) * collectionRowHeight
  const isQuestionSaved = (type: QuestionType) =>
    myQuestions.some(
      (question) =>
        question.week_key === weekKey &&
        question.question_type === type &&
        question.question_text === drafts[type].trim(),
    )

  useEffect(() => {
    let animationFrameId = 0

    function updateCollectionWindow() {
      const grid = collectionGridRef.current

      if (!grid) {
        return
      }

      const columnCount = Math.max(1, Math.floor((grid.clientWidth + collectionGridGap) / (collectionCardMinWidth + collectionGridGap)))
      const totalRows = Math.ceil(selectedQuestions.length / columnCount)
      const gridTop = grid.getBoundingClientRect().top + window.scrollY
      const visibleTop = Math.max(0, window.scrollY - gridTop - collectionRowHeight * collectionOverscanRows)
      const visibleBottom =
        window.scrollY + window.innerHeight - gridTop + collectionRowHeight * collectionOverscanRows
      const startRow = Math.max(0, Math.floor(visibleTop / collectionRowHeight))
      const endRow = Math.min(totalRows, Math.max(startRow + 1, Math.ceil(visibleBottom / collectionRowHeight)))

      setCollectionWindow((current) => {
        if (current.columnCount === columnCount && current.startRow === startRow && current.endRow === endRow) {
          return current
        }

        return { columnCount, startRow, endRow }
      })
    }

    function scheduleCollectionWindowUpdate() {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(updateCollectionWindow)
    }

    const resizeObserver = new ResizeObserver(scheduleCollectionWindowUpdate)
    const grid = collectionGridRef.current

    if (grid) {
      resizeObserver.observe(grid)
    }

    updateCollectionWindow()
    window.addEventListener('scroll', scheduleCollectionWindowUpdate, { passive: true })
    window.addEventListener('resize', scheduleCollectionWindowUpdate)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      window.removeEventListener('scroll', scheduleCollectionWindowUpdate)
      window.removeEventListener('resize', scheduleCollectionWindowUpdate)
    }
  }, [selectedQuestions.length])

  return (
    <main className="page student-page">
      <header className="top-bar">
        <div>
          <h1>{studentNumber}번</h1>
        </div>
        <button className="secondary-button history-open-button" type="button" onClick={() => setIsHistoryOpen(true)}>
          내 기록
        </button>
      </header>

      {error && <p className="notice error">{error}</p>}
      {loading ? (
        <p className="notice pulse">불러오는 중</p>
      ) : (
        <>
          <section className="student-card-grid" aria-label="질문 쓰기">
            <QuestionCard
              label="개인 질문"
              type="personal"
              value={drafts.personal}
              isSaving={savingType === 'personal'}
              isFilled={Boolean(drafts.personal.trim())}
              isSaved={isQuestionSaved('personal')}
              isSelected={collectionType === 'personal'}
              message={messages.personal}
              placeholder="평소 궁금한 내용에 대해 질문해요"
              onChange={handleChange}
              onSelect={handleSelectCollection}
              onSave={handleSave}
            />
            {weeklyTopic && (
              <div className="topic-write">
                <QuestionCard
                  label="주제 질문"
                  type="topic"
                  value={drafts.topic}
                  isSaving={savingType === 'topic'}
                  isFilled={Boolean(drafts.topic.trim())}
                  isSaved={isQuestionSaved('topic')}
                  isSelected={collectionType === 'topic'}
                  message={messages.topic}
                  titleAside={`이번 주 주제: ${weeklyTopic.topic_text}`}
                  placeholder={`${weeklyTopic.topic_text}에 대해 질문해요`}
                  onChange={handleChange}
                  onSelect={handleSelectCollection}
                  onSave={handleSave}
                />
              </div>
            )}
          </section>

          <section className="collection-section" aria-labelledby="collection-title">
            <div className="collection-head">
              <h2 id="collection-title">{selectedCollectionLabel} 모음</h2>
              <div className="collection-tabs" aria-label="질문 모음 선택">
                <button
                  className={collectionType === 'personal' ? 'active' : ''}
                  type="button"
                  onClick={() => handleSelectCollection('personal')}
                >
                  개인 {personalQuestions.length}
                </button>
                <button
                  className={collectionType === 'topic' ? 'active' : ''}
                  type="button"
                  onClick={() => handleSelectCollection('topic')}
                >
                  주제 {topicQuestions.length}
                </button>
              </div>
            </div>

            {selectedQuestions.length > 0 ? (
              <div className="shared-grid collection-grid" key={collectionType} ref={collectionGridRef}>
                {collectionTopSpacerHeight > 0 && (
                  <div
                    className="collection-spacer"
                    style={{ height: collectionTopSpacerHeight }}
                    aria-hidden="true"
                  />
                )}
                {visibleCollectionQuestions.map((question) => (
                  <article className="shared-card" key={question.id}>
                    <div>
                      <strong>{question.student_number}번</strong>
                    </div>
                    <p>{question.question_text}</p>
                  </article>
                ))}
                {collectionBottomSpacerHeight > 0 && (
                  <div
                    className="collection-spacer"
                    style={{ height: collectionBottomSpacerHeight }}
                    aria-hidden="true"
                  />
                )}
              </div>
            ) : (
              <p className="notice">아직 없어요.</p>
            )}
          </section>

          {isHistoryOpen && (
            <div className="modal-backdrop" role="presentation">
              <section className="history-modal" aria-labelledby="history-title" role="dialog" aria-modal="true">
                <div className="modal-head">
                  <h2 id="history-title">내 기록</h2>
                  <button className="secondary-button" type="button" onClick={() => setIsHistoryOpen(false)}>
                    닫기
                  </button>
                </div>
                {historyWeeks.length > 0 ? (
                  <div className="history-list">
                    {historyWeeks.map((historyWeek) => (
                      <article className="history-card" key={historyWeek.weekKey}>
                        <span className="history-week">{formatWeekKeyAsKoreanMonthWeek(historyWeek.weekKey)}</span>
                        <div className="history-question-stack">
                          {(['personal', 'topic'] as QuestionType[]).map((type) => {
                            const question = historyWeek.questions[type]

                            if (!question) {
                              return null
                            }

                            return (
                              <div className="history-question-row" key={type}>
                                <strong className={`history-label history-label-${type}`}>{labels[type]}</strong>
                                <p>{question.question_text}</p>
                              </div>
                            )
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="notice">아직 없어요.</p>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </main>
  )
}
