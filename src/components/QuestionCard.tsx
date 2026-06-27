import { useEffect, useRef, useState } from 'react'
import ifGlassesImage from '../assets/question-glasses/if-glasses.png'
import reverseGlassesImage from '../assets/question-glasses/reverse-glasses.png'
import whyGlassesImage from '../assets/question-glasses/why-glasses.png'
import type { QuestionType } from '../lib/supabase'
import { playSound } from '../lib/sound'
import { QUESTION_MAX_LENGTH } from '../lib/validation'

type QuestionGlassesId = 'why' | 'if' | 'reverse'

interface QuestionGlasses {
  id: QuestionGlassesId
  label: string
  word: string
  image: string
  hint: string
}

interface QuestionCardProps {
  label: string
  type: QuestionType
  value: string
  isSaving: boolean
  isFilled: boolean
  isSaved: boolean
  isSelected?: boolean
  disabled?: boolean
  message?: string
  placeholder?: string
  titleAside?: string
  onChange: (type: QuestionType, value: string) => void
  onSelect?: (type: QuestionType) => void
  onSave: (type: QuestionType) => void
}

const questionGlasses: QuestionGlasses[] = [
  {
    id: 'why',
    label: '왜 안경',
    word: '왜',
    image: whyGlassesImage,
    hint: '이유를 묻는 질문',
  },
  {
    id: 'if',
    label: '만약 안경',
    word: '만약',
    image: ifGlassesImage,
    hint: '상상해 보는 질문',
  },
  {
    id: 'reverse',
    label: '거꾸로 안경',
    word: '거꾸로',
    image: reverseGlassesImage,
    hint: '반대로 생각하는 질문',
  },
]

function stripQuestionStarters(text: string): string {
  let nextText = text.trimStart()
  let hasStarter = true

  while (hasStarter) {
    hasStarter = false
    for (const glasses of questionGlasses) {
      const escapedWord = glasses.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const starterPattern = new RegExp(`^${escapedWord}(\\s|$)`)

      if (starterPattern.test(nextText)) {
        nextText = nextText.replace(starterPattern, '').trimStart()
        hasStarter = true
        break
      }
    }
  }

  return nextText
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightQuestionWords(text: string) {
  return escapeHtml(text).replace(
    /(거꾸로|만약|왜)/g,
    '<span class="question-word-highlight">$1</span>',
  )
}

function getGlassesIdsFromText(text: string): QuestionGlassesId[] {
  const matches = questionGlasses
    .flatMap((glasses) => {
      const escapedWord = glasses.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wordPattern = new RegExp(`(^|\\s)${escapedWord}(?=\\s|$|[?!.,~…])`, 'g')
      const wordMatches: Array<{ id: QuestionGlassesId; index: number }> = []
      let match = wordPattern.exec(text)

      while (match) {
        wordMatches.push({ id: glasses.id, index: match.index + match[1].length })
        match = wordPattern.exec(text)
      }

      return wordMatches
    })
    .sort((first, second) => first.index - second.index)

  return matches.reduce<QuestionGlassesId[]>((ids, match) => {
    if (!ids.includes(match.id)) {
      ids.push(match.id)
    }

    return ids
  }, [])
}

function getCaretOffset(element: HTMLElement) {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0) {
    return element.textContent?.length ?? 0
  }

  const range = selection.getRangeAt(0)
  const prefixRange = range.cloneRange()
  prefixRange.selectNodeContents(element)
  prefixRange.setEnd(range.startContainer, range.startOffset)

  return prefixRange.toString().length
}

function restoreCaretOffset(element: HTMLElement, offset: number) {
  const selection = window.getSelection()

  if (!selection) {
    return
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let currentOffset = offset
  let currentNode = walker.nextNode()

  while (currentNode) {
    const textLength = currentNode.textContent?.length ?? 0

    if (currentOffset <= textLength) {
      const range = document.createRange()
      range.setStart(currentNode, currentOffset)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }

    currentOffset -= textLength
    currentNode = walker.nextNode()
  }

  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function QuestionCard({
  label,
  type,
  value,
  isSaving,
  isFilled,
  isSaved,
  isSelected = false,
  disabled = false,
  message,
  placeholder = '평소 궁금한 내용에 대해 질문해요.',
  titleAside,
  onChange,
  onSelect,
  onSave,
}: QuestionCardProps) {
  const inputRef = useRef<HTMLDivElement>(null)
  const isComposingRef = useRef(false)
  const [selectedGlasses, setSelectedGlasses] = useState<QuestionGlassesId | null>(null)
  const [isGlassesOpen, setIsGlassesOpen] = useState(false)
  const [isInputSparkling, setIsInputSparkling] = useState(false)
  const selectedGlassesIds = getGlassesIdsFromText(value)
  const activeGlassesList = selectedGlassesIds
    .map((id) => questionGlasses.find((glasses) => glasses.id === id))
    .filter((glasses): glasses is QuestionGlasses => glasses !== undefined)
  const activeGlasses = questionGlasses.find((glasses) => glasses.id === selectedGlasses) ?? activeGlassesList[0] ?? null

  function syncSelectedGlasses(nextValue: string) {
    setSelectedGlasses(getGlassesIdsFromText(nextValue)[0] ?? null)
  }

  function renderEditorValue(nextValue: string, caretOffset?: number) {
    const editor = inputRef.current

    if (!editor) {
      return
    }

    editor.innerHTML = highlightQuestionWords(nextValue)

    if (caretOffset !== undefined && document.activeElement === editor) {
      restoreCaretOffset(editor, Math.min(caretOffset, nextValue.length))
    }
  }

  useEffect(() => {
    const editor = inputRef.current
    syncSelectedGlasses(value)

    if (!editor || editor.textContent === value) {
      return
    }

    renderEditorValue(value)
  }, [value])

  function handleEditorInput() {
    const editor = inputRef.current

    if (!editor) {
      return
    }

    const caretOffset = getCaretOffset(editor)
    const nextValue = (editor.textContent ?? '').replace(/[\r\n]+/g, ' ').slice(0, QUESTION_MAX_LENGTH)
    syncSelectedGlasses(nextValue)

    if (!isComposingRef.current) {
      renderEditorValue(nextValue, caretOffset)
    }

    if (nextValue !== value) {
      playSound('type')
    }
    onChange(type, nextValue)
  }

  function handleSelectGlasses(glasses: QuestionGlasses) {
    if (disabled) {
      return
    }

    onSelect?.(type)
    setSelectedGlasses(glasses.id)
    setIsGlassesOpen(false)
    setIsInputSparkling(true)
    playSound('glasses')

    const nextValue = `${glasses.word} ${stripQuestionStarters(value)}`

    if (nextValue !== value) {
      onChange(type, nextValue)
    }

    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 140)
    window.setTimeout(() => {
      setIsInputSparkling(false)
    }, 520)
  }

  return (
    <article
      className={`question-card ${isFilled ? 'has-value' : ''} ${isSaved ? 'is-saved' : ''} ${
        isSelected ? 'is-selected' : ''
      }`}
      aria-current={isSelected ? 'true' : undefined}
      onClick={() => onSelect?.(type)}
      onFocusCapture={() => onSelect?.(type)}
    >
      <div className="question-selection-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="question-title-row">
        <div className="question-title-main">
          <h2>{label}</h2>
          {titleAside && <span>{titleAside}</span>}
        </div>
        <div className={`question-glasses-shell ${isGlassesOpen ? 'is-open' : ''}`}>
          <button
            className={`question-glasses-toggle ${activeGlassesList.length > 0 ? 'has-active-glasses' : ''}`}
            type="button"
            disabled={disabled}
            aria-expanded={isGlassesOpen}
            aria-controls={`${type}-question-glasses-options`}
            aria-label={
              activeGlassesList.length > 0
                ? `${activeGlassesList.map((glasses) => glasses.label).join(', ')} 선택됨`
                : '질문 안경 선택'
            }
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(type)
              setIsGlassesOpen((current) => !current)
              playSound('tap')
            }}
          >
            {activeGlassesList.length > 0 ? (
              <span className="question-glasses-toggle-images" aria-hidden="true">
                {activeGlassesList.map((glasses) => (
                  <img className="question-glasses-toggle-image" src={glasses.image} alt="" key={glasses.id} />
                ))}
              </span>
            ) : (
              <span className="question-glasses-toggle-label">질문 안경</span>
            )}
          </button>
          {isGlassesOpen && (
            <div
              className="question-glasses"
              id={`${type}-question-glasses-options`}
              aria-label={`${label} 질문 안경 선택`}
            >
              {questionGlasses.map((glasses) => (
                <button
                  className={`question-glasses-button ${activeGlasses?.id === glasses.id ? 'is-active' : ''}`}
                  type="button"
                  key={glasses.id}
                  disabled={disabled}
                  aria-label={`${glasses.label} 선택: ${glasses.word}로 질문 시작하기`}
                  aria-pressed={activeGlasses?.id === glasses.id}
                  title={glasses.hint}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSelectGlasses(glasses)
                  }}
                >
                  <img className="glasses-image" src={glasses.image} alt="" aria-hidden="true" />
                  <span className="glasses-label">{glasses.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="question-input-wrap">
        <div className={`question-input-box ${isInputSparkling ? 'is-sparkling' : ''}`}>
          <div
            ref={inputRef}
            className="question-input"
            contentEditable={!disabled}
            role="textbox"
            aria-label={activeGlasses ? `${label}, ${activeGlasses.word} 안경 선택됨` : label}
            aria-disabled={disabled}
            data-placeholder={placeholder}
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onCompositionStart={() => {
              isComposingRef.current = true
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false
              handleEditorInput()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSave(type)
              }
            }}
            onPaste={(event) => {
              event.preventDefault()
              document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
            }}
            spellCheck={false}
          />
        </div>
        <button
          className="primary-button inline-submit"
          type="button"
          disabled={isSaving || disabled}
          onClick={() => onSave(type)}
        >
          {isSaving ? '제출 중' : '제출'}
        </button>
      </div>
      {message && (
        <div className="card-actions">
          <span className="helper-text" key={message}>
            {message}
          </span>
        </div>
      )}
    </article>
  )
}
