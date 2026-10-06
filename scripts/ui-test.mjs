#!/usr/bin/env node
// Browser test: drives the built UI in a real headless Chrome/Edge over the DevTools protocol
// (no extra packages). Signs in through the actual screens (forced 2FA setup, backup codes,
// returning sign-in), checks the role-based tabs, every view, and the Manage Data editors.
//
//   npm run build && npm run test:ui          (BROWSER_PATH=/path/to/chrome to pick a browser)
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const BROWSER = [
  process.env.BROWSER_PATH,
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && fs.existsSync(p))
if (!BROWSER) {
  console.error('No Chrome/Edge found. Set BROWSER_PATH.')
  process.exit(1)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (cond, msg, extra = '') => { results.push(!!cond); console.log(`  ${cond ? '✓' : '✗'} ${msg}${extra ? `  (${extra})` : ''}`) }

function base32Decode(input) {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const ch of input.toUpperCase().replace(/\s/g, '')) bits += a.indexOf(ch).toString(2).padStart(5, '0')
  const out = []
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(out)
}
function totp(secret, off = 0) {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(Math.floor(Date.now() / 30000) + off))
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest()
  const o = h[h.length - 1] & 0xf
  return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0')
}

// ── server (development mode → default accounts) ──
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lrt-ui-'))
fs.cpSync(path.join(ROOT, 'data'), path.join(dir, 'data'), { recursive: true })
const port = 5600 + Math.floor(Math.random() * 300)
const env = { ...process.env }
for (const k of ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'NODE_ENV', 'SEED_TEST_USERS']) delete env[k] // development mode: default test accounts
const server = spawn(process.execPath, [path.join(ROOT, 'server/index.js')], {
  cwd: dir,
  env: { ...env, PORT: String(port), DATA_DIR: path.join(dir, 'data'), STATE_DIR: path.join(dir, 'state'), AUTH_ENV_PATH: path.join(dir, 'x.env'), TOTP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex') },
})
const BASE = `http://localhost:${port}`
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break } catch {} await sleep(200) }

// ── browser ──
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lrt-edge-'))
const cdpPort = 9300 + Math.floor(Math.random() * 300)
const edge = spawn(BROWSER, ['--headless=new', ...(process.env.CI ? ['--no-sandbox'] : []), `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--window-size=1400,1000', 'about:blank'])
let target
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json()).find((t) => t.type === 'page') } catch {}
  if (!target) await sleep(200)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let seq = 0
const pending = new Map()
const consoleErrors = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`)
})
const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
await cdp('Runtime.enable'); await cdp('Log.enable'); await cdp('Page.enable')

async function js(expr) {
  const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed')
  return r.result?.result?.value
}
async function waitFor(cond, label, timeout = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) { if (await js(`return !!(${cond})`)) return true; await sleep(150) }
  ok(false, `timed out waiting for: ${label}`)
  return false
}
const text = () => js('return document.body.innerText')
// Fill an input the way a user would (native setter + input event, so Svelte bindings update).
const fill = (selector, value) => js(`
  const el = ${selector}; if (!el) throw new Error('no element: ' + ${JSON.stringify(selector)})
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)})
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))`)
const clickText = (tag, label) => js(`
  const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(e => e.textContent.trim().startsWith(${JSON.stringify(label)}))
  if (!el) throw new Error('no ${tag} "' + ${JSON.stringify(label)} + '"'); el.click()`)
const byLabel = (label, tag = 'input') => `(() => { const l = [...document.querySelectorAll('label')].find(l => l.textContent.includes(${JSON.stringify(label)})); return l && (l.htmlFor ? document.getElementById(l.htmlFor) : l.querySelector('${tag}')) })()`

async function signInFirstTime(email, password) {
  await cdp('Page.navigate', { url: BASE })
  await waitFor(`document.querySelector('input[type=email]')`, 'sign-in form')
  await fill(`document.querySelector('input[type=email]')`, email)
  await fill(`document.querySelector('input[type=password]')`, password)
  await clickText('button', 'Continue')
  await waitFor(`document.querySelector('.secret-box')`, '2FA setup screen')
  const secret = await js(`return document.querySelector('.secret-box').textContent.trim()`)
  ok(await js(`return document.querySelector('img.qr')?.src.startsWith('data:image/png')`), `${email}: QR code shown on forced 2FA setup`)
  await fill(`document.querySelector('input.code')`, totp(secret))
  await clickText('button', 'Turn on 2FA')
  await waitFor(`document.querySelectorAll('.bc-grid li').length`, 'backup codes')
  ok((await js(`return document.querySelectorAll('.bc-grid li').length`)) === 10, `${email}: 10 backup codes shown once`)
  await clickText('button', "I've saved them")
  await waitFor(`document.querySelector('.sidebar')`, 'main app')
  return secret
}
const tabs = () => js(`return [...document.querySelectorAll('.sv-btn')].map(b => b.textContent.trim())`)

try {
  // The UI starts in Thai. Check that, then switch to English: the choice is kept in localStorage,
  // so the rest of the test (which finds buttons by their English text) runs in English.
  console.log('\n=== language ===')
  await cdp('Page.navigate', { url: BASE })
  await waitFor(`document.querySelector('input[type=email]')`, 'sign-in form')
  ok((await js(`return document.documentElement.lang`)) === 'th', 'UI language defaults to Thai')
  ok(await js(`return [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'ดำเนินการต่อ')`), 'sign-in button is in Thai')
  await fill(`document.querySelector('input[type=email]')`, 'nobody@example.com')
  await fill(`document.querySelector('input[type=password]')`, 'wrong-password')
  await clickText('button', 'ดำเนินการต่อ')
  await waitFor(`document.querySelector('.auth-error')`, 'sign-in error')
  ok((await js(`return document.querySelector('.auth-error').textContent`)) === 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'server error message is shown in Thai')
  consoleErrors.length = 0 // the browser logs that deliberate 401; the final console check is for real errors
  await clickText('.lang-btn', 'EN')
  ok((await js(`return document.documentElement.lang`)) === 'en' && (await text()).includes('Continue'), 'language toggle switches the sign-in screen to English')

  console.log('\n=== admin@example.com ===')
  await signInFirstTime('admin@example.com', 'Admin@12345')
  const t = await tabs()
  ok(['Manage Data', 'Users', 'Audit Log'].every((x) => t.includes(x)), 'admin sees Manage Data, Users and Audit Log tabs', t.join(', '))
  ok((await js(`return document.querySelectorAll('.papers-list > *').length`)) === 5, 'Papers view lists the 5 example papers')

  // Thai in the main app: translated tabs and Buddhist-era (พ.ศ.) dates, then back to English.
  await clickText('.sidebar .lang-btn', 'ไทย')
  const thTabs = await tabs()
  ok(thTabs.includes('จัดการข้อมูล') && thTabs.includes('บทความที่คัดออก'), 'sidebar tabs are in Thai', thTabs.join(', '))
  const footer = await js(`return [...document.querySelectorAll('.footer-line')].map(e => e.textContent).join(' ')`)
  ok(footer.includes(String(new Date().getFullYear() + 543)), 'dates use the Buddhist era in Thai', footer)
  await clickText('.sidebar .lang-btn', 'EN')
  ok((await tabs()).includes('Manage Data'), 'sidebar switches back to English')

  // Every read-only view renders
  for (const view of ['Comparison', 'Domain Tables', 'Gap Analysis', 'Citations', 'Pipeline', 'Charts', 'Rejected Papers']) {
    await clickText('.sv-btn', view)
    await sleep(250)
    ok((await js(`return document.querySelector('.content').innerText.trim().length`)) > 30, `${view} view renders`)
  }

  // Manage Data: add a paper through the generic form (tests Svelte 5 bindings across components)
  await clickText('.sv-btn', 'Manage Data')
  await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('+ Add paper'))`, 'manage data')
  await clickText('button', '+ Add paper')
  await waitFor(`document.querySelector('.if-form')`, 'paper form')
  await fill(byLabel('Title'), 'A UI Test Paper')
  await fill(byLabel('Authors'), 'Tester et al.')
  await fill(byLabel('Venue'), 'Test Conf')
  await fill(byLabel('What: the paper', 'textarea'), 'Checks the Svelte 5 upgrade.')
  await clickText('button', '+ Tag')
  await fill(`document.querySelector('.tag-row input')`, 'UI test')
  await clickText('.if-form button', 'Add')
  await waitFor(`document.body.innerText.includes('#06 A UI Test Paper')`, 'new paper in list')
  ok((await text()).includes('#06 A UI Test Paper'), 'Manage Data → Papers: new paper saved and listed')
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'data/papers.json'), 'utf8')).find((p) => p.id === 6)
  ok(saved?.what === 'Checks the Svelte 5 upgrade.' && saved?.tags?.[0]?.label === 'UI test', 'paper written to papers.json with notes and tag', JSON.stringify(saved?.tags))

  // Edit it, then delete it
  await js(`[...document.querySelectorAll('.ce-row')].find(r => r.textContent.includes('A UI Test Paper')).querySelector('button').click()`)
  await waitFor(`document.querySelector('.ce-row.open .if-form')`, 'edit form')
  await fill(`document.querySelector('.ce-row.open ' + 'input[type=number][max="10"]')`, '3')
  await clickText('.ce-row.open button', 'Save')
  await waitFor(`!document.querySelector('.ce-row.open')`, 'edit saved')
  ok(JSON.parse(fs.readFileSync(path.join(dir, 'data/papers.json'), 'utf8')).find((p) => p.id === 6)?.score === 3, 'editing a paper saves the change')
  await js(`[...document.querySelectorAll('.ce-row')].find(r => r.textContent.includes('A UI Test Paper')).querySelectorAll('button')[1].click()`)
  await js(`document.querySelector('.ce-row .btn.danger').click()`)
  await waitFor(`!document.body.innerText.includes('A UI Test Paper')`, 'paper deleted')
  ok(!JSON.parse(fs.readFileSync(path.join(dir, 'data/papers.json'), 'utf8')).some((p) => p.id === 6), 'deleting a paper removes it from papers.json')

  // Comparison editor: change one cell and save
  await clickText('.tab', 'Comparison')
  await waitFor(`document.querySelector('.cmp table select')`, 'comparison grid')
  await fill(`document.querySelector('.cmp table select')`, 'partial')
  await clickText('button', 'Save comparison')
  await waitFor(`document.querySelector('.cmp .msg.ok')`, 'comparison saved')
  const cmp = JSON.parse(fs.readFileSync(path.join(dir, 'data/comparison.json'), 'utf8'))
  ok(cmp.cells['1']['1']['0'].status === 'partial', 'Comparison editor saves a changed cell')

  // Settings (single-object form)
  await clickText('.tab', 'Settings')
  await waitFor(byLabel('App title'), 'settings form')
  await fill(byLabel('App title'), 'My Thesis Review')
  await clickText('.if-form button', 'Save')
  await waitFor(`document.querySelector('.logo-title')?.textContent === 'My Thesis Review'`, 'title updated')
  ok((await js(`return document.querySelector('.logo-title').textContent`)) === 'My Thesis Review', 'Settings: new title shows in the sidebar')

  // Users and audit log
  await clickText('.sv-btn', 'Users')
  await waitFor(`document.querySelectorAll('.users tbody tr').length >= 3`, 'users table')
  ok((await js(`return document.querySelectorAll('.users tbody tr').length`)) === 3, 'Users view lists admin, manager and user')
  await clickText('.sv-btn', 'Audit Log')
  await waitFor(`document.querySelectorAll('.audit tbody tr').length > 3`, 'audit rows')
  ok((await text()).includes('2FA set up') && (await text()).includes('Data saved'), 'Audit Log shows 2FA and data events')

  // Account panel: new backup codes
  await js(`document.querySelector('.account-btn').click()`)
  await waitFor(`document.querySelector('.panel')`, 'account panel')
  await clickText('.panel button', 'New backup codes')
  await clickText('.panel button', 'Create new codes')
  await waitFor(`document.querySelectorAll('.panel .bc-grid li').length === 10`, 'new codes')
  ok(true, 'Account panel: regenerating backup codes shows 10 new codes')
  await js(`document.querySelector('.close-btn').click()`)

  // Theme toggle and sign out
  const before = await js(`return document.documentElement.dataset.theme`)
  await js(`document.querySelector('.theme-toggle').click()`)
  ok((await js(`return document.documentElement.dataset.theme`)) !== before, 'theme toggle switches light/dark')
  await clickText('button', 'Sign out')
  await waitFor(`document.querySelector('input[type=email]')`, 'back to sign-in')
  ok(true, 'Sign out returns to the sign-in screen')

  console.log('\n=== user@example.com (read-only role) ===')
  await signInFirstTime('user@example.com', 'User@12345')
  const ut = await tabs()
  ok(!ut.includes('Manage Data') && !ut.includes('Users') && !ut.includes('Audit Log'), 'user sees no Manage Data / Users / Audit Log tabs', ut.join(', '))
  ok((await js(`return document.querySelector('.logo-title').textContent`)) === 'My Thesis Review', "user sees the admin's saved changes")
  await clickText('button', 'Sign out')
  await waitFor(`document.querySelector('input[type=email]')`, 'sign-in')

  console.log('\n=== returning sign-in with a code ===')
  await fill(`document.querySelector('input[type=email]')`, 'manager@example.com')
  await fill(`document.querySelector('input[type=password]')`, 'Manager@12345')
  await clickText('button', 'Continue')
  await waitFor(`document.querySelector('.secret-box')`, 'setup')
  const mSecret = await js(`return document.querySelector('.secret-box').textContent.trim()`)
  await fill(`document.querySelector('input.code')`, totp(mSecret))
  await clickText('button', 'Turn on 2FA')
  await waitFor(`document.querySelector('.bc-grid')`, 'codes')
  await clickText('button', "I've saved them")
  await waitFor(`document.querySelector('.sidebar')`, 'app')
  const mt = await tabs()
  ok(mt.includes('Manage Data') && mt.includes('Users') && !mt.includes('Audit Log'), 'manager sees Manage Data and Users but not Audit Log', mt.join(', '))
  await clickText('button', 'Sign out')
  await waitFor(`document.querySelector('input[type=email]')`, 'sign-in')
  await fill(`document.querySelector('input[type=email]')`, 'manager@example.com')
  await fill(`document.querySelector('input[type=password]')`, 'Manager@12345')
  await clickText('button', 'Continue')
  await waitFor(`document.body.innerText.includes('Enter the 6-digit code')`, 'verify screen')
  await fill(`document.querySelector('input.code')`, totp(mSecret, 1))
  await clickText('button', 'Verify')
  await waitFor(`document.querySelector('.sidebar')`, 'app after verify')
  ok(true, 'returning sign-in: 6-digit code screen → app')

  const realErrors = consoleErrors.filter((e) => !(e.includes('401 (Unauthorized)') && e.includes('/api/auth/me')))
  ok(realErrors.length === 0, 'no JavaScript errors or CSP violations in the browser console', realErrors.join(' | ').slice(0, 300))
} catch (e) {
  ok(false, 'unexpected error: ' + e.message)
  console.log('  page text:', (await text().catch(() => '')).slice(0, 400))
  console.log('  console errors:', consoleErrors)
} finally {
  ws.close()
  edge.kill()
  const exited = new Promise((r) => server.once('exit', r)); server.kill(); await exited
  await sleep(500)
  for (const d of [dir, profile]) { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }) } catch {} }
}
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`)
process.exit(results.every(Boolean) ? 0 : 1)
