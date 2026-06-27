import { useCallback, useEffect, useState } from 'react'
import { AdminPage } from './components/AdminPage'
import { NumberSelect } from './components/NumberSelect'
import { StudentPage } from './components/StudentPage'
import thumbnailImage from './assets/question-news-thumbnail.avif'
import { playSound } from './lib/sound'

const STORAGE_KEY = 'question-news-student-number'
const SPLASH_DURATION_MS = 2100

function readStoredNumber(): number | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  const parsed = stored ? Number(stored) : Number.NaN

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : null
}

export default function App() {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [isSplashVisible, setIsSplashVisible] = useState(true)

  useEffect(() => {
    setSelectedNumber(readStoredNumber())
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsSplashVisible(false)
    }, SPLASH_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [])

  function handleSelect(studentNumber: number) {
    playSound('tap')
    localStorage.setItem(STORAGE_KEY, String(studentNumber))
    setSelectedNumber(studentNumber)
  }

  const handleReset = useCallback(() => {
    playSound('tap')
    localStorage.removeItem(STORAGE_KEY)
    setSelectedNumber(null)
  }, [])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key === 'Enter' && event.altKey && event.metaKey) {
        event.preventDefault()
        handleReset()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [handleReset])

  const page =
    selectedNumber === null ? (
      <NumberSelect onSelect={handleSelect} />
    ) : selectedNumber === 0 ? (
      <AdminPage />
    ) : (
      <StudentPage studentNumber={selectedNumber} />
    )

  return (
    <>
      {page}
      {isSplashVisible && (
        <button
          className="splash-screen"
          type="button"
          aria-label="인트로 닫기"
          onClick={() => setIsSplashVisible(false)}
        >
          <img src={thumbnailImage} alt="" />
        </button>
      )}
    </>
  )
}
