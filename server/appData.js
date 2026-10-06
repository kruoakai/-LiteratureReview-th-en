import { loadData } from './data.js'
import { loadPdfIndex, hasPdfIds } from './papers.js'

export function getAppData() {
  const data = loadData()
  // Re-scan on every load (a few readdir calls) so newly dropped-in PDFs appear without a restart.
  loadPdfIndex()
  const pdfIds = hasPdfIds()
  const allPapers = data.papers.map(p => ({ ...p, hasPdf: pdfIds.has(p.id) }))

  // Domain membership is derived from each paper's `domain` field, so domains.json never needs
  // a hand-maintained paper list.
  const domains = data.domains.map(d => ({
    ...d,
    papers: allPapers.filter(p => p.domain === d.id).map(p => p.id),
  }))

  return { ...data, papers: allPapers, domains }
}
