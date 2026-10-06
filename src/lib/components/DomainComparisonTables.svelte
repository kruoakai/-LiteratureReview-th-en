<script>
  import { downloadWorkbook, sheetName } from '../xlsx.js'
  import { toPng, toJpeg } from 'html-to-image'
  import { t } from '../i18n.js'

  export let papers
  export let domains
  export let dimensions
  // cells[domainId][paperId][dimensionIndex] = { status, note }; missing entries mean 'no'
  export let cells = {}

  let sectionEl
  let capturing = false

  function bgColor() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()
    return v || '#ffffff'
  }

  async function captureNode(node, filename, format) {
    capturing = true
    // .table-outer scrolls horizontally on screen (overflow-x: auto) so wide tables
    // stay usable in the UI — but that same clipping means html-to-image would only
    // capture whatever was scrolled into view. Temporarily expand each wrapper to its
    // full content width so the export contains the entire table, then restore it.
    const scrollers = Array.from(node.querySelectorAll('.table-outer'))
    const restore = scrollers.map(el => ({ el, width: el.style.width, overflow: el.style.overflow }))
    try {
      scrollers.forEach(el => {
        el.style.width = `${el.scrollWidth}px`
        el.style.overflow = 'visible'
      })
      // let the DOM re-render with .export-btn hidden and the wrappers expanded before snapshotting
      await new Promise(r => setTimeout(r, 30))
      // html-to-image sizes its canvas from node.clientWidth/clientHeight, which does NOT
      // grow just because a descendant now overflows it (only scrollWidth/scrollHeight do),
      // so the full content size has to be passed in explicitly.
      const opts = {
        backgroundColor: bgColor(),
        pixelRatio: 2,
        width: node.scrollWidth,
        height: node.scrollHeight,
      }
      const dataUrl = format === 'jpg'
        ? await toJpeg(node, { ...opts, quality: 0.95 })
        : await toPng(node, opts)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = filename
      a.click()
    } finally {
      restore.forEach(({ el, width, overflow }) => {
        el.style.width = width
        el.style.overflow = overflow
      })
      capturing = false
    }
  }

  function exportDomainImage(d, format) {
    const node = document.getElementById(`domain-ct-${d.id}`)
    if (node) captureNode(node, `comparison-domain-${d.id}-${d.slug.replace(/^domain-\d+-/, '')}.${format === 'jpg' ? 'jpg' : 'png'}`, format)
  }

  function exportAllImage(format) {
    if (sectionEl) captureNode(sectionEl, `comparison-tables-by-domain.${format === 'jpg' ? 'jpg' : 'png'}`, format)
  }

  $: byDomain = domains.map(d => ({
    ...d,
    rows: d.papers.map(id => papers.find(p => p.id === id)).filter(Boolean),
  }))

  const statusIcon = s => ({ yes: '✓', partial: '◑', no: '—', note: '·' }[s] ?? '—')
  const statusClass = s => ({ yes: 'cell-yes', partial: 'cell-partial', no: 'cell-no', note: 'cell-note' }[s] ?? 'cell-no')

  function cellFor(domainId, paperId, dimIndex) {
    return cells[domainId]?.[paperId]?.[dimIndex] || { status: 'no' }
  }

  // Export uses a plain Yes/No — the on-screen table keeps the fuller Yes/Partial/No/Note detail.
  function cellText(cell) {
    return cell.status === 'no' ? $t('dct.no') : $t('dct.yes')
  }

  function colHeader(p) {
    return `#${p.num} ${p.authors.split(',')[0]} (${p.year})`
  }

  function domainAoa(d) {
    return [
      [$t('dct.dimension'), ...d.rows.map(colHeader)],
      ...dimensions.map((dim, di) => [dim, ...d.rows.map(p => cellText(cellFor(d.id, p.id, di)))]),
    ]
  }

  function exportDomain(d) {
    downloadWorkbook(`comparison-domain-${d.id}-${d.slug.replace(/^domain-\d+-/, '')}.xlsx`, [
      { name: sheetName(d.label, `D${d.id}`), rows: domainAoa(d) },
    ])
  }

  function exportAll() {
    downloadWorkbook('comparison-tables-by-domain.xlsx', byDomain.map(d => ({ name: sheetName(d.label, `D${d.id}`), rows: domainAoa(d) })))
  }
</script>

<section class="dct-section" class:capturing bind:this={sectionEl}>
  <div class="dct-header">
    <div>
      <h2>{$t('dct.title')}</h2>
      <p class="subtitle">{$t('dct.subtitle', { n: dimensions.length })}</p>
    </div>
    <div class="export-group">
      <button class="export-btn primary" on:click={exportAll}>{$t('dt.exportAll')}</button>
      <button class="export-btn" on:click={() => exportAllImage('png')}>{$t('dct.exportPng')}</button>
      <button class="export-btn" on:click={() => exportAllImage('jpg')}>{$t('dct.exportJpg')}</button>
    </div>
  </div>

  {#each byDomain as d}
    <div class="domain-ct" id="domain-ct-{d.id}">
      <div class="domain-ct-head">
        <span class="dot" style="background:{d.color}"></span>
        <h3>D{d.id} — {d.fullLabel}</h3>
        <span class="count-chip" style="color:{d.color};border-color:{d.color}55;background:{d.color}15">{$t('dct.papers', { n: d.rows.length })}</span>
        <button class="export-btn" on:click={() => exportDomain(d)}>{$t('dct.sheet')}</button>
        <button class="export-btn" on:click={() => exportDomainImage(d, 'png')}>⬇ PNG</button>
        <button class="export-btn" on:click={() => exportDomainImage(d, 'jpg')}>⬇ JPG</button>
      </div>

      <div class="table-outer">
        <table class="ct-table">
          <thead>
            <tr>
              <th class="dim-col">{$t('dct.dimension')}</th>
              {#each d.rows as p}
                <th class="paper-col" title={p.title}>
                  <div class="col-num">#{p.num}</div>
                  <div class="col-author">{p.authors.split(',')[0]}</div>
                  <div class="col-year">{p.year}</div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each dimensions as dim, di}
              <tr>
                <td class="dim-cell">{dim}</td>
                {#each d.rows as p}
                  {@const cell = cellFor(d.id, p.id, di)}
                  <td class="data-cell {statusClass(cell.status)}" title={cell.note || ''}>
                    <span class="icon">{statusIcon(cell.status)}</span>
                    {#if cell.note && cell.status !== 'no'}
                      <span class="note">{cell.note}</span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/each}
</section>

<style>
  .dct-section { display: flex; flex-direction: column; gap: 24px; margin-top: 28px; }
  .dct-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .dct-header h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; }
  .subtitle { font-size: 0.85rem; color: var(--text2); max-width: 640px; }

  .export-group { display: flex; gap: 8px; flex-wrap: wrap; }

  .dct-section.capturing .export-btn { display: none; }

  .export-btn {
    padding: 7px 14px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text2); font-size: 0.76rem; font-weight: 600; cursor: pointer;
    white-space: nowrap; transition: all var(--transition);
  }
  .export-btn:hover { border-color: var(--accent); color: var(--text); }
  .export-btn.primary {
    background: var(--accent); color: #fff; border-color: var(--accent);
    font-size: 0.85rem; padding: 10px 18px;
  }
  .export-btn.primary:hover { filter: brightness(1.08); color: #fff; }

  .domain-ct { display: flex; flex-direction: column; gap: 8px; }
  .domain-ct-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .domain-ct-head h3 { font-size: 1rem; font-weight: 700; }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .count-chip { font-size: 0.7rem; font-weight: 700; padding: 2px 9px; border-radius: 99px; border: 1px solid; }
  .count-chip.muted { color: var(--text3); border-color: var(--border); background: var(--surface2); }

  .table-outer { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius2); }
  .ct-table { width: 100%; border-collapse: collapse; }
  thead tr { background: var(--surface2); position: sticky; top: 0; z-index: 2; }

  .dim-col {
    text-align: left; padding: 10px 14px; font-size: 0.72rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em; color: var(--text3);
    min-width: 180px; white-space: nowrap; position: sticky; left: 0;
    background: var(--surface2); z-index: 3;
  }
  .paper-col { text-align: center; padding: 8px 10px; min-width: 90px; border-left: 1px solid var(--border); vertical-align: top; }
  .col-num { font-size: 0.75rem; font-weight: 800; }
  .col-author { font-size: 0.65rem; color: var(--text2); margin-top: 2px; }
  .col-year { font-size: 0.62rem; color: var(--text3); }

  tbody tr { border-top: 1px solid var(--border); }
  tbody tr:hover { background: var(--surface2); }

  .dim-cell {
    padding: 9px 14px; font-size: 0.82rem; color: var(--text2); white-space: nowrap;
    position: sticky; left: 0; background: var(--surface); border-right: 1px solid var(--border);
  }

  .data-cell { text-align: center; padding: 8px 6px; font-size: 0.8rem; border-left: 1px solid var(--border); vertical-align: middle; cursor: default; }
  .data-cell .icon { font-weight: 700; font-size: 0.9rem; }
  .data-cell .note { display: block; font-size: 0.63rem; color: inherit; opacity: 0.75; margin-top: 1px; white-space: nowrap; }

  .cell-yes     { color: var(--score8); }
  .cell-partial { color: var(--score7); }
  .cell-no      { color: var(--text3); }
  .cell-note    { color: var(--accent); }
</style>
