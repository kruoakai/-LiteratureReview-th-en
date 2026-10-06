import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// All corpus content lives in plain JSON files under DATA_DIR (defaults to ./data, which ships
// with a small example corpus). Files are re-read on every request so edits show up after a
// browser refresh, without restarting the server. Optional files fall back to empty values.
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')

const DEFAULT_CONFIG = {
  title: 'Literature Review',
  subtitle: '',
  icon: '📚',
  pipelineTitle: 'Research Pipeline',
  pipelineSubtitle: '',
}

function readJson(name, fallback) {
  const file = path.join(DATA_DIR, name)
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`Invalid JSON in ${file}: ${e.message}`)
  }
}

export function loadConfig() {
  return { ...DEFAULT_CONFIG, ...readJson('config.json', {}) }
}

export function loadDomains() {
  return readJson('domains.json', [])
}

export function loadData() {
  const comparison = readJson('comparison.json', { dimensions: [], cells: {} })
  return {
    config: loadConfig(),
    domains: loadDomains(),
    papers: readJson('papers.json', []),
    citations: readJson('citations.json', {}),
    gaps: readJson('gaps.json', []),
    dimensions: comparison.dimensions || [],
    dimensionCells: comparison.cells || {},
    stackLayers: readJson('pipeline.json', []),
    rejected: readJson('rejected.json', []),
  }
}
