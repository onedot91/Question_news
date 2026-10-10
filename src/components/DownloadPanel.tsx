import { useState } from 'react'

import { claimCumulativeDownload } from '../lib/api'
import type { Question } from '../lib/data'
import { buildTxtContent, downloadTxt, selectQuestionsForDownload, todayLabel } from '../lib/download'
import { playSound } from '../lib/sound'

interface DownloadPanelProps {
  readonly questions: readonly Question[]
  readonly onStatusChange: () => Promise<void>
}

export function DownloadPanel({ questions, onStatusChange }: DownloadPanelProps) {
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const pendingCount = selectQuestionsForDownload(questions, 'cumulative').length
  const totalCount = questions.length

  async function downloadCumulative() {
    setSaving(true)
    setStatusMessage('')

    try {
      const { questions: claimedQuestions } = await claimCumulativeDownload()

      if (claimedQuestions.length === 0) {
        playSound('tap')
        setStatusMessage('새로 받을 질문이 없습니다.')
        return
      }

      downloadTxt(`질문-누적-${todayLabel()}.txt`, buildTxtContent(claimedQuestions))
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
      setSaving(false)
    }
  }

  function downloadFull() {
    if (totalCount === 0) {
      playSound('tap')
      setStatusMessage('다운로드할 질문이 없습니다.')
      return
    }

    downloadTxt(`질문-전체-${todayLabel()}.txt`, buildTxtContent(questions))
    playSound('download')
    setStatusMessage(`${totalCount}개 질문을 전체 다운로드했습니다.`)
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
            <dt>질문</dt>
            <dd>
              전체 {totalCount} · 완료 {totalCount - pendingCount} · 대기 {pendingCount}
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
            <button type="button" disabled={saving || pendingCount === 0} onClick={downloadCumulative}>
              {saving ? '처리 중' : `새 질문 누적 (${pendingCount})`}
            </button>
          </div>
        </section>

        <section className="download-group full" aria-labelledby="full-download-title">
          <div>
            <h3 id="full-download-title">전체 다운로드</h3>
            <p>지금까지 들어온 질문을 모두 내려받습니다.</p>
          </div>
          <div className="download-actions">
            <button type="button" disabled={saving || totalCount === 0} onClick={downloadFull}>
              전체 질문 ({totalCount})
            </button>
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
