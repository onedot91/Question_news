import type { QuestionType } from '../lib/supabase'
import { playSound } from '../lib/sound'
import { QUESTION_MAX_LENGTH } from '../lib/validation'

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
        <h2>{label}</h2>
        {titleAside && <span>{titleAside}</span>}
      </div>
      <div className="question-input-wrap">
        <input
          className="question-input"
          aria-label={label}
          value={value}
          autoComplete="off"
          disabled={disabled}
          maxLength={QUESTION_MAX_LENGTH}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[\r\n]+/g, ' ')
            if (nextValue !== value) {
              playSound('type')
            }
            onChange(type, nextValue)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSave(type)
            }
          }}
          placeholder={placeholder}
          spellCheck={false}
        />
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
