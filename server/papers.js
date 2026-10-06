import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadDomains } from './data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// PDFs are not copied into the Docker image — the folder is mounted as a read-only volume
// (see docker-compose.yml), so the location is configurable.
const PAPERS_DIR = process.env.PAPERS_DIR || path.join(__dirname, '..', 'papers')

// Maps paper id -> absolute PDF path. Built once at startup by scanning known domain
// folders for files named "D{domain}-NN-....pdf", never from
// user input, so /api/papers/:id/pdf can only ever serve a file this scan already found —
// no path traversal is possible.
let pdfById = new Map()

export function loadPdfIndex() {
  pdfById = new Map()
  for (const domain of loadDomains()) {
    const dir = path.join(PAPERS_DIR, domain.slug)
    let entries = []
    try {
      entries = fs.readdirSync(dir)
    } catch {
      continue // domain folder not present on this deployment — skip quietly
    }
    for (const name of entries) {
      const match = name.match(/^D\d+-(\d+)-.+\.pdf$/i)
      if (!match) continue
      const num = Number(match[1])
      pdfById.set(num, path.join(dir, name))
    }
  }
  return pdfById.size
}

export function getPdfPath(id) {
  return pdfById.get(Number(id)) || null
}

export function hasPdfIds() {
  return new Set(pdfById.keys())
}
