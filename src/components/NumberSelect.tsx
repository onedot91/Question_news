import gomaCharacter from '../assets/goma-newspaper-character.png'

interface NumberSelectProps {
  onSelect: (studentNumber: number) => void
}

export function NumberSelect({ onSelect }: NumberSelectProps) {
  function handleSelect(studentNumber: number) {
    onSelect(studentNumber)
  }

  return (
    <main className="page number-page">
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
        <button className="number-button teacher pop-in" type="button" onClick={() => handleSelect(0)}>
          0번
          <span>선생님</span>
        </button>
      </section>
    </main>
  )
}
