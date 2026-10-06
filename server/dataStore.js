import fs from 'fs'
import path from 'path'
import { DATA_DIR, loadData } from './data.js'

// Admin edits from the "Manage Data" tab are written straight back to the JSON files in DATA_DIR,
// so the files stay the single source of truth and can still be hand-edited. Each save validates
// the whole collection, keeps the previous version as <file>.bak, and writes atomically.

const PRIORITIES = ['critical', 'high', 'medium', 'low']
const GAP_STATUSES = ['open', 'partial', 'closed']
const CELL_STATUSES = ['yes', 'partial', 'note', 'no']
const TAG_TYPES = ['yes', 'warn', '']
const REJECTED_STATUSES = ['rejected', 'removed']

function fail(message) {
  const err = new Error(message)
  err.status = 400
  throw err
}

const str = (v) => (v == null ? '' : String(v).trim())

function requireStr(v, what) {
  const s = str(v)
  if (!s) fail(`${what} is required`)
  return s
}

function int(v, what, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(v)
  if (v === '' || v == null || !Number.isInteger(n) || n < min || n > max) {
    fail(`${what} must be a whole number${min > -Infinity ? ` from ${min}` : ''}${max < Infinity ? ` to ${max}` : ''}`)
  }
  return n
}

function oneOf(v, allowed, what) {
  const s = str(v)
  if (!allowed.includes(s)) fail(`${what} must be one of: ${allowed.filter(Boolean).join(', ')}`)
  return s
}

function array(v, what) {
  if (!Array.isArray(v)) fail(`${what} must be a list`)
  return v
}

function strList(v, what) {
  return array(v ?? [], what).map(str).filter(Boolean)
}

function intList(v, what) {
  return array(v ?? [], what).map((x) => int(x, `${what} entry`))
}

function assertUnique(items, key, what) {
  const seen = new Set()
  for (const item of items) {
    if (seen.has(item[key])) fail(`Duplicate ${what}: ${item[key]}`)
    seen.add(item[key])
  }
}

function validateConfig(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail('config must be an object')
  return {
    title: requireStr(v.title, 'Title'),
    subtitle: str(v.subtitle),
    icon: str(v.icon) || '📚',
    pipelineTitle: str(v.pipelineTitle) || 'Research Pipeline',
    pipelineSubtitle: str(v.pipelineSubtitle),
  }
}

function validateDomains(v, current) {
  const domains = array(v, 'domains').map((d, i) => {
    const where = `Domain #${i + 1}`
    const slug = requireStr(d.slug, `${where} slug`)
    if (!/^[a-z0-9-]+$/.test(slug)) fail(`${where} slug may only contain a-z, 0-9 and "-"`)
    return {
      id: int(d.id, `${where} id`, { min: 1 }),
      slug,
      color: str(d.color) || '#6c8fff',
      label: requireStr(d.label, `${where} label`),
      fullLabel: str(d.fullLabel) || str(d.label),
      description: str(d.description),
      target: int(d.target ?? 0, `${where} target`, { min: 0 }),
      keywords: strList(d.keywords, `${where} keywords`),
    }
  })
  assertUnique(domains, 'id', 'domain id')
  assertUnique(domains, 'slug', 'domain slug')
  const ids = new Set(domains.map((d) => d.id))
  const orphaned = current.papers.filter((p) => !ids.has(p.domain))
  if (orphaned.length) {
    fail(`Cannot remove a domain that still has papers (paper ${orphaned.map((p) => p.id).join(', ')}). Move or delete those papers first.`)
  }
  return domains
}

function validatePapers(v, current) {
  const domainIds = new Set(current.domains.map((d) => d.id))
  const papers = array(v, 'papers').map((p, i) => {
    const where = `Paper #${p?.id ?? i + 1}`
    const id = int(p.id, `${where} id`, { min: 1 })
    const domain = int(p.domain, `${where} domain`)
    if (!domainIds.has(domain)) fail(`${where} domain ${domain} does not exist`)
    const paper = {
      id,
      num: String(id).padStart(2, '0'),
      domain,
      score: int(p.score, `${where} score`, { min: 1, max: 10 }),
      caution: !!p.caution,
      title: requireStr(p.title, `${where} title`),
      authors: requireStr(p.authors, `${where} authors`),
      venue: requireStr(p.venue, `${where} venue`),
      year: int(p.year, `${where} year`),
    }
    if (str(p.doi)) paper.doi = str(p.doi)
    Object.assign(paper, {
      what: str(p.what),
      how: str(p.how),
      results: str(p.results),
      usage: str(p.usage),
      tags: array(p.tags ?? [], `${where} tags`)
        .filter((t) => str(t?.label))
        .map((t) => ({ label: str(t.label), type: oneOf(t.type ?? '', TAG_TYPES, `${where} tag type`) })),
    })
    return paper
  })
  assertUnique(papers, 'id', 'paper id')
  return papers
}

function validateComparison(v) {
  if (!v || typeof v !== 'object') fail('comparison must be an object')
  const dimensions = strList(v.dimensions, 'dimensions')
  const cells = {}
  for (const [domainId, byPaper] of Object.entries(v.cells || {})) {
    for (const [paperId, byDim] of Object.entries(byPaper || {})) {
      for (const [dimIndex, cell] of Object.entries(byDim || {})) {
        const di = int(dimIndex, 'dimension index', { min: 0 })
        if (di >= dimensions.length) continue
        const status = oneOf(cell?.status ?? 'no', CELL_STATUSES, 'cell status')
        const note = str(cell?.note)
        if (status === 'no' && !note) continue // 'no' is the default — don't store empty cells
        ;((cells[domainId] ??= {})[paperId] ??= {})[di] = note ? { status, note } : { status }
      }
    }
  }
  return { dimensions, cells }
}

function validateGaps(v) {
  const gaps = array(v, 'gaps').map((g, i) => {
    const where = `Gap #${i + 1}`
    const gap = {
      id: requireStr(g.id, `${where} id`),
      title: requireStr(g.title, `${where} title`),
      priority: oneOf(g.priority, PRIORITIES, `${where} priority`),
      status: oneOf(g.status, GAP_STATUSES, `${where} status`),
      description: str(g.description),
      evidence: strList(g.evidence, `${where} evidence`),
      opportunity: str(g.opportunity),
    }
    if (str(g.searchGuidance)) gap.searchGuidance = str(g.searchGuidance)
    return gap
  })
  assertUnique(gaps, 'id', 'gap id')
  return gaps
}

function validateCitations(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail('citations must be an object keyed by paper id')
  const out = {}
  for (const [paperId, c] of Object.entries(v)) {
    const id = int(paperId, 'citation paper id', { min: 1 })
    out[id] = {
      where: str(c?.where),
      label: str(c?.label),
      text: requireStr(c?.text, `Citation for paper ${id}: text`),
    }
  }
  return out
}

function validatePipeline(v) {
  const layers = array(v, 'pipeline').map((l, i) => {
    const where = `Pipeline layer #${i + 1}`
    const layer = {
      step: int(l.step, `${where} step`, { min: 0 }),
      label: requireStr(l.label, `${where} label`),
      sublabel: str(l.sublabel),
      color: str(l.color) || '#6c8fff',
    }
    if (l.domain !== '' && l.domain != null) layer.domain = int(l.domain, `${where} domain`)
    layer.papers = intList(l.papers, `${where} papers`)
    layer.note = str(l.note)
    return layer
  })
  if (layers.filter((l) => l.step === 0).length > 1) fail('Only one pipeline layer can use step 0 (cross-cutting)')
  return layers
}

function validateRejected(v) {
  const rejected = array(v, 'rejected papers').map((r, i) => {
    const where = `Rejected paper #${i + 1}`
    const item = {
      id: requireStr(r.id, `${where} id`),
      status: oneOf(r.status, REJECTED_STATUSES, `${where} status`),
      batch: str(r.batch),
      title: requireStr(r.title, `${where} title`),
      authors: str(r.authors),
      venue: str(r.venue),
      year: r.year === '' || r.year == null ? null : int(r.year, `${where} year`),
      reason: str(r.reason),
    }
    if (r.freedNumber !== '' && r.freedNumber != null) item.freedNumber = int(r.freedNumber, `${where} freed number`)
    return item
  })
  assertUnique(rejected, 'id', 'rejected paper id')
  return rejected
}

const COLLECTIONS = {
  config: { file: 'config.json', validate: validateConfig },
  domains: { file: 'domains.json', validate: validateDomains },
  papers: { file: 'papers.json', validate: validatePapers },
  comparison: { file: 'comparison.json', validate: validateComparison },
  gaps: { file: 'gaps.json', validate: validateGaps },
  citations: { file: 'citations.json', validate: validateCitations },
  pipeline: { file: 'pipeline.json', validate: validatePipeline },
  rejected: { file: 'rejected.json', validate: validateRejected },
}

export const COLLECTION_NAMES = Object.keys(COLLECTIONS)

function writeJson(file, value) {
  const target = path.join(DATA_DIR, file)
  if (fs.existsSync(target)) fs.copyFileSync(target, `${target}.bak`)
  const tmp = `${target}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n')
  fs.renameSync(tmp, target)
}

// Deleting papers would otherwise leave citations, comparison cells and pipeline pills that point
// at ids which no longer exist.
function pruneReferences(removedIds) {
  if (!removedIds.size) return
  const data = loadData()
  const citations = Object.fromEntries(Object.entries(data.citations).filter(([id]) => !removedIds.has(Number(id))))
  if (Object.keys(citations).length !== Object.keys(data.citations).length) writeJson('citations.json', citations)

  let cellsChanged = false
  const cells = {}
  for (const [domainId, byPaper] of Object.entries(data.dimensionCells)) {
    for (const [paperId, byDim] of Object.entries(byPaper)) {
      if (removedIds.has(Number(paperId))) cellsChanged = true
      else (cells[domainId] ??= {})[paperId] = byDim
    }
  }
  if (cellsChanged) writeJson('comparison.json', { dimensions: data.dimensions, cells })

  if (data.stackLayers.some((l) => (l.papers || []).some((id) => removedIds.has(id)))) {
    writeJson('pipeline.json', data.stackLayers.map((l) => ({ ...l, papers: (l.papers || []).filter((id) => !removedIds.has(id)) })))
  }
}

export function saveCollection(name, value) {
  const collection = COLLECTIONS[name]
  if (!collection) fail(`Unknown collection: ${name}`)
  const current = loadData()
  const clean = collection.validate(value, current)
  writeJson(collection.file, clean)
  if (name === 'papers') {
    const kept = new Set(clean.map((p) => p.id))
    pruneReferences(new Set(current.papers.map((p) => p.id).filter((id) => !kept.has(id))))
  }
  return clean
}

// Papers added through the old "+ Add Paper" form lived in a separate CUSTOM_PAPERS_PATH store.
// Fold them into papers.json once (re-numbering on id clashes) and rename the old file.
export function migrateCustomPapers() {
  const legacyPath = process.env.CUSTOM_PAPERS_PATH || path.join(process.cwd(), 'custom-papers.json')
  if (!fs.existsSync(legacyPath)) return 0
  let legacy
  try {
    legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'))
  } catch {
    return 0
  }
  if (!Array.isArray(legacy) || !legacy.length) return 0
  const { papers } = loadData()
  let nextId = Math.max(0, ...papers.map((p) => p.id)) + 1
  const ids = new Set(papers.map((p) => p.id))
  const added = legacy.map((p) => {
    const id = ids.has(p.id) ? nextId++ : p.id
    ids.add(id)
    nextId = Math.max(nextId, id + 1)
    return { ...p, id, num: String(id).padStart(2, '0') }
  })
  writeJson('papers.json', [...papers, ...added])
  fs.renameSync(legacyPath, `${legacyPath}.migrated`)
  return added.length
}
