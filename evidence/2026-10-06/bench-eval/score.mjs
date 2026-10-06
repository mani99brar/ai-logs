// Uniform acceptance scorer for one MD Manager implementation.
// Usage: node score.mjs <cloneDir> <uiUrl> <outPrefix> [mode]
//   mode = "full" (default): normal load + mocked loading/empty/http500/network-abort states
//   mode = "backend-down": only the normal load, expecting a real error state (API not running)
// Playwright is loaded from the clone's own node_modules so every arm uses the same 1.63.0 build.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const [cloneDir, uiUrl, outPrefix, mode = 'full'] = process.argv.slice(2)
const require = createRequire(`${cloneDir}/package.json`)
const { chromium } = require('@playwright/test')

const FIXTURES = [
  { source: 'pi', rel: 'skills/review.md' },
  { source: 'pi', rel: 'workflow.md' },
  { source: 'claude', rel: 'empty.md' },
  { source: 'claude', rel: 'subagents/implementer.md' },
  { source: 'claude', rel: 'workflow.md' },
]
const LABEL = { pi: 'pi', claude: 'claude' }

const result = { cloneDir, uiUrl, mode, startedAt: new Date().toISOString(), states: {} }
const browser = await chromium.launch()

async function capture(name, setup, waitFn) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
  let apiRequests = 0
  page.on('request', r => { if (r.url().includes('/api/')) apiRequests++ })
  const st = { name }
  try {
    if (setup) await setup(page)
    const resp = await page.goto(uiUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    st.httpStatus = resp ? resp.status() : null
    await waitFn(page, st)
    st.text = (await page.evaluate(() => document.body.innerText)).replace(/\n{2,}/g, '\n').trim()
    st.rows = await page.$$eval('tbody tr', trs => trs.map(tr => [...tr.querySelectorAll('td,th')].map(td => td.innerText.replace(/\s+/g, ' ').trim())))
    st.roles = await page.$$eval('[role=status],[role=alert]', els => els.map(e => `${e.getAttribute('role')}: ${e.innerText.replace(/\s+/g, ' ').trim()}`))
    st.buttons = await page.$$eval('button', bs => bs.map(b => b.innerText.trim()).filter(Boolean).slice(0, 20))
    const shot = `${outPrefix}-${name}.png`
    await page.screenshot({ path: shot, fullPage: true })
    st.screenshot = shot
  } catch (e) {
    st.exception = String(e).slice(0, 400)
  }
  st.apiRequests = apiRequests
  st.consoleErrors = consoleErrors.slice(0, 5)
  await ctx.close()
  return st
}

const settle = ms => async (page) => { await page.waitForTimeout(ms) }
const waitForText = (re, ms) => async (page, st) => {
  const t0 = Date.now()
  try {
    await page.waitForFunction(src => new RegExp(src, 'i').test(document.body.innerText), re.source, { timeout: ms })
    st.matchedAfterMs = Date.now() - t0
  } catch { st.matchedAfterMs = null }
  await page.waitForTimeout(300)
}

if (mode === 'backend-down') {
  result.states.backendDown = await capture('backend-down', null, waitForText(/could not|couldn.t|unable|failed|error/, 15000))
} else {
  // Normal load against the real backend.
  result.states.normal = await capture('normal', null, async (page, st) => {
    try { await page.waitForSelector('tbody tr', { timeout: 20000 }) } catch { st.noRows = true }
    await page.waitForTimeout(500)
  })
  // Loading: hold /api/files for 4 s, then let it through to the real backend.
  result.states.loading = await capture('loading', async page => {
    await page.route('**/api/files**', async route => { await new Promise(r => setTimeout(r, 4000)); await route.continue().catch(() => {}) })
  }, async (page, st) => { await waitForText(/loading/, 2500)(page, st) })
  // Empty: the API answers 200 with an empty list in the same shape the real API uses ({files: []}).
  result.states.empty = await capture('empty', async page => {
    await page.route('**/api/files**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: [] }) }))
  }, waitForText(/no (markdown )?files|no .*found/, 8000))
  // HTTP error.
  result.states.http500 = await capture('http500', async page => {
    await page.route('**/api/files**', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated listing failure (scorer)' }) }))
  }, waitForText(/could not|couldn.t|unable|failed|error/, 8000))
  // Network failure.
  result.states.networkAbort = await capture('network-abort', async page => {
    await page.route('**/api/files**', route => route.abort('connectionrefused'))
  }, waitForText(/could not|couldn.t|unable|failed|error/, 8000))

  // Score acceptance items 1-3 from the normal-load DOM rows.
  const rows = result.states.normal.rows || []
  const lc = rows.map(r => r.map(c => c.toLowerCase()))
  const matches = FIXTURES.map(f => {
    const base = f.rel.split('/').pop()
    const dir = f.rel.includes('/') ? f.rel.slice(0, f.rel.lastIndexOf('/')) : ''
    const repoDir = `fixtures/${f.source}${dir ? '/' + dir : ''}`
    let strong = -1, weak = -1
    lc.forEach((cells, i) => {
      const hasRel = cells.some(c => c === f.rel || c.endsWith(' ' + f.rel) || c.startsWith(f.rel + ' '))
      const hasSrc = cells.some(c => c === LABEL[f.source] || c.startsWith(LABEL[f.source] + ' '))
      if (hasRel && hasSrc && strong < 0) strong = i
      const joined = cells.join(' | ')
      if (joined.includes(base) && joined.includes(repoDir) && weak < 0) weak = i
    })
    return { ...f, strongRow: strong, weakRow: weak, found: strong >= 0 || weak >= 0 }
  })
  const wf = matches.filter(m => m.rel === 'workflow.md')
  result.score = {
    rowCount: rows.length,
    rows,
    fixtures: matches,
    allFiveFound: matches.every(m => m.found),
    allFiveBySourceAndRelPath: matches.every(m => m.strongRow >= 0),
    extraRows: rows.filter((_, i) => !matches.some(m => m.strongRow === i || m.weakRow === i)),
    notesTxtPresent: /notes\.txt/i.test(result.states.normal.text || ''),
    workflowDistinct: wf.every(m => m.found) && new Set(wf.map(m => (m.strongRow >= 0 ? m.strongRow : m.weakRow))).size === 2,
    workflowBySourceLabel: wf.every(m => m.strongRow >= 0) && wf[0].strongRow !== wf[1].strongRow,
    // A state only counts if the page actually requested the API and the message appeared.
    loadingShown: result.states.loading.apiRequests > 0 && result.states.loading.matchedAfterMs != null,
    emptyShown: result.states.empty.apiRequests > 0 && result.states.empty.matchedAfterMs != null && (result.states.empty.rows || []).length === 0,
    http500Shown: result.states.http500.apiRequests > 0 && result.states.http500.matchedAfterMs != null && (result.states.http500.rows || []).length === 0,
    networkErrorShown: result.states.networkAbort.apiRequests > 0 && result.states.networkAbort.matchedAfterMs != null && (result.states.networkAbort.rows || []).length === 0,
  }
}
await browser.close()
result.finishedAt = new Date().toISOString()
writeFileSync(`${outPrefix}-${mode}.json`, JSON.stringify(result, null, 2))
const s = result.score
if (s) {
  console.log(`rows=${s.rowCount} allFive=${s.allFiveFound} bySrc+rel=${s.allFiveBySourceAndRelPath} notesTxt=${s.notesTxtPresent} wfDistinct=${s.workflowDistinct} wfBySource=${s.workflowBySourceLabel} extra=${JSON.stringify(s.extraRows)}`)
  console.log(`loading=${s.loadingShown} empty=${s.emptyShown} http500=${s.http500Shown} network=${s.networkErrorShown}`)
  for (const k of ['loading', 'empty', 'http500', 'networkAbort']) console.log(`  ${k}: roles=${JSON.stringify(result.states[k].roles)} apiReq=${result.states[k].apiRequests}`)
} else {
  const b = result.states.backendDown
  console.log(`backend-down matched=${b.matchedAfterMs != null} roles=${JSON.stringify(b.roles)} rows=${(b.rows || []).length}`)
}
