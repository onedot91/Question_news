import { useMemo, useState } from 'react'

import { claimCumulativeDownload } from '../lib/api'
import type { DownloadMode, Question } from '../lib/data'
import { buildTxtContent, downloadTxt, selectQuestionsForDownload } from '../lib/download'
import { playSound } from '../lib/sound'

interface DownloadPanelProps {
  readonly questions: readonly Question[]
  readonly weekKey: string
  readonly onStatusChange: () => Promise<void>
}

const downloadModes = [
  { mode: 'personal', label: '개인 질문' },
  { mode: 'topic', label: '주제 질문' },
  { mode: 'all', label: '전체 질문' },
] as const satisfies readonly { readonly mode: DownloadMode; readonly label: string }[]

const filenameLabels = {
  personal: '개인질문',
  topic: '주제질문',
  all: '전체질문',
} as const satisfies Record<DownloadMode, string>

export function DownloadPanel({ questions, weekKey, onStatusChange }: DownloadPanelProps) {
  const [savingMode, setSavingMode] = useState<DownloadMode | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const progress = useMemo(() => {
    const personal = questions.filter((question) => question.question_type === 'personal')
    const topic = questions.filter((question) => question.question_type === 'topic')

    return {
      personal: {
        submitted: personal.length,
        completed: personal.filter((question) => question.downloaded_at !== null).length,
        pending: personal.filter((question) => question.downloaded_at === null).length,
      },
      topic: {
        submitted: topic.length,
        completed: topic.filter((question) => question.downloaded_at !== null).length,
        pending: topic.filter((question) => question.downloaded_at === null).length,
      },
    }
  }, [questions])

  async function downloadCumulative(mode: DownloadMode) {
    setSavingMode(mode)
    setStatusMessage('')

    try {
      const { questions: claimedQuestions } = await claimCumulativeDownload(weekKey, mode)

      if (claimedQuestions.length === 0) {
        playSound('tap')
        setStatusMessage('새로 누적할 질문이 없습니다.')
        return
      }

      downloadTxt(
        `${filenameLabels[mode]}-누적-${weekKey}.txt`,
        buildTxtContent(claimedQuestions, mode),
      )
      playSound('download')
      setStatusMessage(`${claimedQuestions.length}개 질문을 누적 다운로드했습니다.`)
      await onStatusChange()
    } catch (error) {
      if (error instanceof Error) {
        playSound('error')
        setStatusMessage('누적 다운로드에 실패했습니다. 서버 설정을 확인해 주세요.')
        return
      }

      throw error
    } finally {
      setSavingMode(null)
    }
  }

  function downloadFull(mode: DownloadMode) {
    const selectedQuestions = selectQuestionsForDownload(questions, mode, 'full')

    if (selectedQuestions.length === 0) {
      playSound('tap')
      setStatusMessage('다운로드할 질문이 없습니다.')
      return
    }

    downloadTxt(`${filenameLabels[mode]}-${weekKey}.txt`, buildTxtContent(selectedQuestions, mode))
    playSound('download')
    setStatusMessage(`${selectedQuestions.length}개 질문을 전체 다운로드했습니다.`)
  }

  return (
    <section className="download-panel" aria-labelledby="download-panel-title">
      <div className="download-panel-head">
        <div>
          <h2 id="download-panel-title">신문 이미지용 TXT</h2>
          <p>누적 완료 여부는 서버에 저장되며, 전체 다운로드에는 영향을 주지 않습니다.</p>
        </div>
        <dl className="download-progress" aria-label="누적 다운로드 현황">
          <div>
            <dt>개인</dt>
            <dd>
              완료 {progress.personal.completed} · 대기 {progress.personal.pending} · 미제출{' '}
              {23 - progress.personal.submitted}
            </dd>
          </div>
          <div>
            <dt>주제</dt>
            <dd>
              완료 {progress.topic.completed} · 대기 {progress.topic.pending} · 제출 {progress.topic.submitted}
            </dd>
          </div>
        </dl>
      </div>

      <div className="download-groups">
        <section className="download-group cumulative" aria-labelledby="cumulative-download-title">
          <div>
            <h3 id="cumulative-download-title">누적 다운로드</h3>
            <p>아직 받지 않은 질문만 내려받고 완료로 기록합니다.</p>
          </div>
          <div className="download-actions">
            {downloadModes.map(({ mode, label }) => {
              const pendingCount = selectQuestionsForDownload(questions, mode, 'cumulative').length

              return (
                <button
                  type="button"
                  key={mode}
                  disabled={savingMode !== null || pendingCount === 0}
                  onClick={() => downloadCumulative(mode)}
                >
                  {savingMode === mode ? '처리 중' : `${label} 누적 (${pendingCount})`}
                </button>
              )
            })}
          </div>
        </section>

        <section className="download-group full" aria-labelledby="full-download-title">
          <div>
            <h3 id="full-download-title">전체 다운로드</h3>
            <p>현재 제출된 질문을 기존 방식 그대로 모두 내려받습니다.</p>
          </div>
          <div className="download-actions">
            {downloadModes.map(({ mode, label }) => {
              const totalCount = selectQuestionsForDownload(questions, mode, 'full').length

              return (
                <button
                  type="button"
                  key={mode}
                  disabled={savingMode !== null || totalCount === 0}
                  onClick={() => downloadFull(mode)}
                >
                  {label} 전체 ({totalCount})
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {statusMessage && (
        <p className="download-message" role="status">
          {statusMessage}
        </p>
      )}
    </section>
  )
}
