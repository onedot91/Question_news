export function PrivacyPolicy() {
  return (
    <main className="page policy-page">
      <header className="policy-header">
        <p className="eyebrow">Question News</p>
        <h1>개인정보처리방침</h1>
        <p>Question News는 개인정보보호법에 따라 이용자의 개인정보를 보호하고 관련 고충을 처리합니다.</p>
      </header>

      <section className="policy-panel" aria-label="개인정보처리방침 내용">
        <article>
          <h2>1. 개인정보 처리 목적</h2>
          <p>
            학생 질문 작성, 저장, 조회, 교사용 질문 관리, 서비스 운영 및 오류 확인을 위해 개인정보를
            처리합니다.
          </p>
        </article>

        <article>
          <h2>2. 처리하는 개인정보 항목</h2>
          <p>
            필수 항목은 학생 번호, 작성한 질문 내용, 작성 및 수정 시각입니다. 서비스 이용 과정에서 접속
            기록, 브라우저 정보 등 기본적인 기술 정보가 처리될 수 있습니다.
          </p>
        </article>

        <article>
          <h2>3. 개인정보 처리 및 보유 기간</h2>
          <p>
            질문 기록은 수업 운영 목적 달성 시까지 보관하며, 교사가 초기화하거나 삭제하면 지체 없이
            파기합니다. 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </article>

        <article>
          <h2>4. 개인정보 제3자 제공</h2>
          <p>
            Question News는 법령에 근거가 있거나 이용자 동의가 있는 경우를 제외하고 개인정보를 제3자에게
            제공하지 않습니다.
          </p>
        </article>

        <article>
          <h2>5. 개인정보 처리 위탁</h2>
          <p>
            서비스 제공을 위해 Neon에 데이터 저장 및 관리 업무를, Vercel에 웹사이트 호스팅과 API 운영 업무를
            이용합니다.
          </p>
        </article>

        <article>
          <h2>6. 정보주체의 권리</h2>
          <p>
            이용자는 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 요청은 서비스 관리자 또는
            담당 교사에게 문의하면 처리합니다.
          </p>
        </article>

        <article>
          <h2>7. 개인정보 파기</h2>
          <p>
            보유 기간이 지나거나 처리 목적이 달성된 개인정보는 복구할 수 없는 방법으로 삭제합니다.
          </p>
        </article>

        <article>
          <h2>8. 개인정보 보호책임자</h2>
          <p>
            개인정보 보호책임자: Question News 관리자
            <br />
            문의: 서비스 관리자 또는 담당 교사
          </p>
        </article>

        <article>
          <h2>9. 시행일</h2>
          <p>이 개인정보처리방침은 2026년 6월 28일부터 시행합니다.</p>
        </article>
      </section>

      <a className="policy-home-link secondary-button" href="/">
        처음으로
      </a>
    </main>
  )
}
