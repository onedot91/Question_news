import { useCallback, useEffect, useState } from 'react'
import { AdminPage } from './components/AdminPage'
import { PrivacyPolicy } from './components/PrivacyPolicy'
import { QuestionPage } from './components/QuestionPage'
import thumbnailImage from './assets/question-news-thumbnail.avif'
import { playSound } from './lib/sound'

const TEACHER_STORAGE_KEY = 'question-news-teacher'
const AUTHOR_TOKEN_STORAGE_KEY = 'question-news-author-token'
const SPLASH_DURATION_MS = 2100

function readStoredTeacherMode(): boolean {
  try {
    return localStorage.getItem(TEACHER_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeStoredTeacherMode(isTeacher: boolean) {
  try {
    if (isTeacher) {
      localStorage.setItem(TEACHER_STORAGE_KEY, '1')
    } else {
      localStorage.removeItem(TEACHER_STORAGE_KEY)
    }
  } catch {
    // 저장소를 쓸 수 없으면 이번 접속 동안만 유지합니다.
  }
}

// 브라우저마다 하나씩 만드는 익명 식별값입니다. "내가 한 질문"을 찾는 데만 씁니다.
function readAuthorToken(): string {
  try {
    const stored = localStorage.getItem(AUTHOR_TOKEN_STORAGE_KEY)

    if (stored) {
      return stored
    }

    const created = crypto.randomUUID()
    localStorage.setItem(AUTHOR_TOKEN_STORAGE_KEY, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

export default function App() {
  const [isTeacher, setIsTeacher] = useState(readStoredTeacherMode)
  const [authorToken] = useState(readAuthorToken)
  const [isSplashVisible, setIsSplashVisible] = useState(true)
  const isPrivacyPage = window.location.pathname === '/privacy'

  useEffect(() => {
    if (isPrivacyPage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsSplashVisible(false)
    }, SPLASH_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isPrivacyPage])

  const changeTeacherMode = useCallback((nextIsTeacher: boolean) => {
    playSound('tap')
    writeStoredTeacherMode(nextIsTeacher)
    setIsTeacher(nextIsTeacher)
  }, [])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const isResetShortcut =
        event.key === 'Enter' && event.altKey && (event.metaKey || (event.ctrlKey && !event.metaKey))

      if (isResetShortcut) {
        event.preventDefault()
        changeTeacherMode(false)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [changeTeacherMode])

  if (isPrivacyPage) {
    return <PrivacyPolicy />
  }

  return (
    <>
      {isTeacher ? (
        <AdminPage onExit={() => changeTeacherMode(false)} />
      ) : (
        <QuestionPage authorToken={authorToken} onTeacherReveal={() => changeTeacherMode(true)} />
      )}
      <footer className="site-footer">
        <a href="/privacy">개인정보처리방침</a>
      </footer>
      {isSplashVisible && (
        <button
          className="splash-screen"
          type="button"
          aria-label="인트로 닫기"
          onClick={() => setIsSplashVisible(false)}
        >
          <span className="splash-card-wrap">
            <img src={thumbnailImage} alt="" />
            <span className="splash-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </span>
        </button>
      )}
    </>
  )
}
