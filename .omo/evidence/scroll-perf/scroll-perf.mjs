import { chromium } from 'playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173'
const outputName = process.argv[3] ?? 'scroll.json'
const outputPath = join(__dirname, outputName)

const weekKey = '2026-W27'
const now = '2026-07-02T00:00:00.000Z'
const questionText =
  '왜 우리 반 친구들은 같은 뉴스를 보고도 서로 다른 질문을 떠올릴까요? Chromebook에서 스크롤 테스트를 위한 긴 질문입니다.'

const questions = Array.from({ length: 240 }, (_, index) => {
  const studentNumber = (index % 23) + 1
  const questionType = index % 2 === 0 ? 'personal' : 'topic'

  return {
    id: `question-${index + 1}`,
    student_number: studentNumber,
    question_type: questionType,
    question_text: `${questionText} ${index + 1}`,
    week_key: weekKey,
    created_at: now,
    updated_at: now,
  }
})

function jsonResponse(body) {
  return {
    status: 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
    },
    body: JSON.stringify(body),
  }
}

await mkdir(__dirname, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1,
})

const page = await context.newPage()
const client = await context.newCDPSession(page)
await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

await page.route('**/rest/v1/questions**', async (route) => {
  const requestUrl = route.request().url()
  const body = requestUrl.includes('student_number=eq.')
    ? questions.filter((question) => question.student_number === 7)
    : questions

  await route.fulfill(jsonResponse(body))
})

await page.route('**/rest/v1/weekly_topics**', async (route) => {
  await route.fulfill(
    jsonResponse([
      {
        id: 'topic-1',
        week_key: weekKey,
        topic_text: 'Chromebook에서 뉴스 질문을 읽는 방법',
        created_at: now,
        updated_at: now,
      },
    ]),
  )
})

await page.addInitScript(() => {
  window.localStorage.setItem('question-news-student-number', '7')
})

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '인트로 닫기' }).click()
await page.getByRole('heading', { name: '7번' }).waitFor()
await page.getByText('개인 질문 모음').waitFor()

const samples = []
for (let index = 0; index < 28; index += 1) {
  const duration = await page.evaluate(async () => {
    const start = performance.now()
    window.scrollBy({ top: 360, behavior: 'instant' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    return performance.now() - start
  })
  samples.push(duration)
}

const sorted = [...samples].sort((first, second) => first - second)
const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
const max = sorted[sorted.length - 1] ?? 0
const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
const cardCount = await page.locator('.shared-card').count()

await page.screenshot({ path: join(__dirname, outputName.replace('.json', '.png')), fullPage: false })
await writeFile(
  outputPath,
  JSON.stringify(
    {
      pass: max < 50 && p95 < 20,
      max,
      p95,
      samples,
      scrollHeight,
      cardCount,
    },
    null,
    2,
  ),
)

await browser.close()
