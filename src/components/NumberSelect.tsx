import { useState } from 'react'
import gomaCharacter from '../assets/goma-newspaper-character.png'

interface NumberSelectProps {
  onSelect: (studentNumber: number) => void
}

export function NumberSelect({ onSelect }: NumberSelectProps) {
  const [teacherClickCount, setTeacherClickCount] = useState(0)
  const isTeacherVisible = teacherClickCount >= 5

  function handleSelect(studentNumber: number) {
    onSelect(studentNumber)
  }

  function handleTeacherReveal() {
    setTeacherClickCount((current) => Math.min(current + 1, 5))
  }

  return (
    <main className="page number-page">
      <button
        className="teacher-reveal-button"
        type="button"
        aria-label="선생님 번호 보이기"
        onClick={handleTeacherReveal}
      />
      <section className="intro">
        <div>
          <p className="eyebrow">질문하기</p>
          <h1>
            <span>번호</span> 선택
          </h1>
        </div>
        <div className="intro-scene" aria-hidden="true">
          <img className="intro-character" src={gomaCharacter} alt="" />
        </div>
      </section>

      <section className="number-grid" aria-label="학생 번호 선택">
        {Array.from({ length: 23 }, (_, index) => index + 1).map((number) => (
          <button className="number-button pop-in" key={number} type="button" onClick={() => handleSelect(number)}>
            {number}번
          </button>
        ))}
        {isTeacherVisible && (
          <button className="number-button teacher pop-in" type="button" onClick={() => handleSelect(0)}>
            0번
            <span>선생님</span>
          </button>
        )}
      </section>
    </main>
  )
}
