<script>
  import { downloadWorkbook, sheetName } from '../xlsx.js'
  import { t } from '../i18n.js'

  export let papers
  export let domains

  // Exports use the current UI language for headers; cell values are the corpus data as entered.
  $: DOMAIN_HEADER = ['#', $t('col.title'), $t('col.authors'), $t('col.venue'), $t('col.year'), $t('col.relevance'), $t('col.caution'), 'DOI']

  $: papersByDomain = domains.map(d => ({
    ...d,
    rows: d.papers
      .map(id => papers.find(p => p.id === id))
      .filter(Boolean),
  }))

  function scoreColor(s) {
    if (s >= 9) return 'var(--score9)'
    if (s >= 8) return 'var(--score8)'
    if (s >= 7) return 'var(--score7)'
    if (s >= 6) return 'var(--score6)'
    return 'var(--score5)'
  }

  function domainAoa(d) {
    return [
      DOMAIN_HEADER,
      ...d.rows.map(p => [
        p.num, p.title, p.authors, p.venue, p.year, p.score,
        p.caution ? $t('dt.cautionCell') : '', p.doi || '',
      ]),
    ]
  }

  function summaryAoa() {
    const header = [$t('col.domain'), $t('col.name'), $t('dt.papersNow'), $t('col.target'), $t('dt.pctTarget'), $t('dt.avgRelevance')]
    const rows = papersByDomain.map(d => {
      const avg = d.rows.length ? (d.rows.reduce((s, p) => s + p.score, 0) / d.rows.length).toFixed(1) : ''
      return [`D${d.id}`, d.fullLabel, d.rows.length, d.target, d.target ? `${Math.round((d.rows.length / d.target) * 100)}%` : '', avg]
    })
    return [header, ...rows]
  }

  function exportAll() {
    downloadWorkbook('domain-tables.xlsx', [
      { name: $t('dt.summary'), rows: summaryAoa() },
      ...papersByDomain.map(d => ({ name: sheetName(d.label, `D${d.id}`), rows: domainAoa(d) })),
    ])
  }

  function exportDomain(d) {
    downloadWorkbook(`domain-${d.id}-${d.slug.replace(/^domain-\d+-/, '')}.xlsx`, [
      { name: sheetName(d.label, `D${d.id}`), rows: domainAoa(d) },
    ])
  }
</script>

<section class="dt-section">
  <div class="dt-header">
    <div>
      <h2>{$t('title.domtbl')}</h2>
      <p class="subtitle">{$t('dt.subtitle')}</p>
    </div>
    <button class="export-btn primary" on:click={exportAll}>{$t('dt.exportAll')}</button>
  </div>

  {#each papersByDomain as d}
    <div class="domain-block">
      <div class="domain-block-head">
        <div class="domain-title">
          <span class="dot" style="background:{d.color}"></span>
          <h3>D{d.id} — {d.fullLabel}</h3>
          <span class="count-chip" style="color:{d.color};border-color:{d.color}55;background:{d.color}15">
            {d.rows.length} / {d.target}
          </span>
        </div>
        <button class="export-btn" on:click={() => exportDomain(d)}>{$t('dt.exportSheet')}</button>
      </div>
      <p class="domain-desc">{d.description}</p>

      <div class="table-outer">
        <table class="dt-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-title">{$t('col.title')}</th>
              <th class="col-authors">{$t('col.authors')}</th>
              <th class="col-venue">{$t('col.venue')}</th>
              <th class="col-year">{$t('col.year')}</th>
              <th class="col-score">{$t('col.relevance')}</th>
            </tr>
          </thead>
          <tbody>
            {#each d.rows as p, i}
              <tr class:alt={i % 2 === 1}>
                <td class="col-num mono">{p.num}</td>
                <td class="col-title">
                  {p.title}
                  {#if p.caution}<span class="badge caution">{$t('dt.cautionBadge')}</span>{/if}
                </td>
                <td class="col-authors">{p.authors}</td>
                <td class="col-venue">{p.venue}</td>
                <td class="col-year mono">{p.year}</td>
                <td class="col-score mono" style="color:{scoreColor(p.score)}">{p.score}/10</td>
              </tr>
            {/each}
            {#if d.rows.length === 0}
              <tr><td colspan="6" class="empty-row">{$t('dt.empty')}</td></tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {/each}

  <p class="table-note">{$t('dt.note')}</p>
</section>

<style>
  .dt-section { display: flex; flex-direction: column; gap: 20px; }

  .dt-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .dt-header h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; }
  .subtitle { font-size: 0.85rem; color: var(--text2); max-width: 640px; }

  .export-btn {
    padding: 8px 16px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text2); font-size: 0.8rem; font-weight: 600; cursor: pointer;
    white-space: nowrap; transition: all var(--transition);
  }
  .export-btn:hover { border-color: var(--accent); color: var(--text); }
  .export-btn.primary {
    background: var(--accent); color: #fff; border-color: var(--accent);
    font-size: 0.85rem; padding: 10px 18px;
  }
  .export-btn.primary:hover { filter: brightness(1.08); color: #fff; }

  .domain-block {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 16px 18px; display: flex; flex-direction: column; gap: 8px;
  }
  .domain-block-head {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  }
  .domain-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .domain-title h3 { font-size: 1rem; font-weight: 700; }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .count-chip {
    font-size: 0.7rem; font-weight: 700; padding: 2px 9px;
    border-radius: 99px; border: 1px solid;
  }
  .domain-desc { font-size: 0.78rem; color: var(--text3); }

  .table-outer { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); }
  .dt-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  thead tr { background: var(--surface2); }
  thead th { text-align: left; padding: 8px 10px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text3); white-space: nowrap; }
  .col-num { width: 44px; }
  .col-year { width: 56px; }
  .col-score { width: 76px; }
  tbody tr { border-top: 1px solid var(--border); }
  tbody tr:hover { background: var(--surface2); }
  tr.alt { background: rgba(255,255,255,0.015); }
  tr.alt:hover { background: var(--surface2); }
  tbody td { padding: 7px 10px; vertical-align: top; color: var(--text2); }
  .col-title { color: var(--text); min-width: 260px; }
  .col-authors { min-width: 140px; }
  .mono { font-variant-numeric: tabular-nums; font-weight: 600; }
  .empty-row { text-align: center; color: var(--text3); font-style: italic; padding: 16px; }

  .table-note { font-size: 0.75rem; color: var(--text3); font-style: italic; text-align: center; }
</style>
