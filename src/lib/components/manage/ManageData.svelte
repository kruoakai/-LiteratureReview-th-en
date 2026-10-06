<script>
  import CollectionEditor from './CollectionEditor.svelte'
  import ComparisonEditor from './ComparisonEditor.svelte'
  import { saveCollection } from '../../auth.js'
  import { t } from '../../i18n.js'

  export let appData
  // Re-fetches /api/app-data so every view (and these editors) shows what was just saved.
  export let refresh

  let section = 'papers'

  async function saveTo(name, value) {
    await saveCollection(name, value)
    await refresh()
  }

  $: ({ config, domains, papers, gaps, citations, stackLayers: pipeline, rejected, dimensions, dimensionCells } = appData)

  const nextId = (items) => Math.max(0, ...items.map((i) => Number(i.id) || 0)) + 1
  const nextCode = (items, prefix) => {
    const nums = items.map((i) => Number(String(i.id).replace(prefix, ''))).filter(Number.isInteger)
    return `${prefix}${Math.max(0, ...nums) + 1}`
  }
  const PALETTE = ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f97316', '#ef4444', '#22d3ee', '#ec4899']
  const domainLabel = (id) => {
    const d = domains.find((x) => x.id === id)
    return d ? `D${d.id} ${d.label}` : `D${id}`
  }

  $: domainOptions = domains.map((d) => ({ value: d.id, label: `D${d.id} — ${d.label}` }))
  $: paperOptions = [...papers].sort((a, b) => a.id - b.id).map((p) => ({ value: p.id, label: `#${p.num} ${p.title}` }))

  // Field labels follow the UI language; the keys (and so the saved JSON) never change.
  $: configFields = [
    { key: 'title', label: $t('md.f.appTitle'), type: 'text', required: true },
    { key: 'icon', label: $t('md.f.icon'), type: 'text', hint: $t('md.f.iconHint') },
    { key: 'subtitle', label: $t('md.f.subtitle'), type: 'text', wide: true, hint: $t('md.f.subtitleHint') },
    { key: 'pipelineTitle', label: $t('md.f.pipelineTitle'), type: 'text' },
    { key: 'pipelineSubtitle', label: $t('md.f.pipelineSubtitle'), type: 'text', wide: true },
  ]

  $: domainFields = [
    { key: 'id', label: $t('md.f.domainId'), type: 'number', min: 1, required: true, hint: $t('md.f.domainIdHint') },
    { key: 'label', label: $t('md.f.shortName'), type: 'text', required: true },
    { key: 'fullLabel', label: $t('md.f.fullName'), type: 'text' },
    { key: 'slug', label: $t('md.f.slug'), type: 'text', required: true, hint: $t('md.f.slugHint') },
    { key: 'color', label: $t('md.f.color'), type: 'color' },
    { key: 'target', label: $t('md.f.target'), type: 'number', min: 0 },
    { key: 'description', label: $t('md.f.description'), type: 'textarea', rows: 2 },
    { key: 'keywords', label: $t('md.f.keywords'), type: 'lines', hint: $t('md.f.keywordsHint') },
  ]

  $: paperFields = [
    { key: 'id', label: $t('md.f.paperId'), type: 'number', min: 1, required: true, hint: $t('md.f.paperIdHint') },
    { key: 'domain', label: $t('col.domain'), type: 'select', options: domainOptions },
    { key: 'score', label: $t('md.f.relevance'), type: 'number', min: 1, max: 10, required: true },
    { key: 'title', label: $t('col.title'), type: 'text', required: true, wide: true },
    { key: 'authors', label: $t('col.authors'), type: 'text', required: true, placeholder: $t('md.f.authorsPh') },
    { key: 'venue', label: $t('col.venue'), type: 'text', required: true, placeholder: $t('md.f.venuePh') },
    { key: 'year', label: $t('col.year'), type: 'number', required: true, hint: $t('md.f.yearHint') },
    { key: 'doi', label: 'DOI', type: 'text', placeholder: '10.xxxx/...' },
    { key: 'caution', label: $t('md.f.caution'), type: 'checkbox' },
    { key: 'what', label: $t('md.f.what'), type: 'textarea', rows: 2 },
    { key: 'how', label: $t('md.f.how'), type: 'textarea', rows: 2 },
    { key: 'results', label: $t('card.results'), type: 'textarea', rows: 2 },
    { key: 'usage', label: $t('md.f.usage'), type: 'textarea', rows: 2 },
    { key: 'tags', label: $t('md.f.tags'), type: 'tags' },
  ]

  $: gapFields = [
    { key: 'id', label: $t('md.f.gapId'), type: 'text', required: true, placeholder: 'G1' },
    { key: 'priority', label: $t('md.f.priority'), type: 'select', options: ['critical', 'high', 'medium', 'low'].map((v) => ({ value: v, label: $t(`gap.p.${v}`) })) },
    { key: 'status', label: $t('md.f.status'), type: 'select', options: [
      { value: 'open', label: $t('md.f.gapOpen') },
      { value: 'partial', label: $t('md.f.gapPartial') },
      { value: 'closed', label: $t('md.f.gapClosed') },
    ] },
    { key: 'title', label: $t('col.title'), type: 'text', required: true, wide: true },
    { key: 'description', label: $t('md.f.description'), type: 'textarea' },
    { key: 'evidence', label: $t('md.f.evidence'), type: 'lines', hint: $t('md.f.evidenceHint') },
    { key: 'opportunity', label: $t('md.f.opportunity'), type: 'textarea', rows: 2 },
    { key: 'searchGuidance', label: $t('gap.search'), type: 'textarea', rows: 2, hint: $t('md.f.searchHint') },
  ]

  $: citationFields = [
    { key: 'paperId', label: $t('col.paper'), type: 'select', options: paperOptions, wide: true },
    { key: 'where', label: $t('md.f.where'), type: 'text', placeholder: $t('md.f.wherePh') },
    { key: 'label', label: $t('md.f.label'), type: 'text', placeholder: $t('md.f.labelPh') },
    { key: 'text', label: $t('md.f.citeText'), type: 'textarea', rows: 4 },
  ]
  $: citationItems = Object.entries(citations)
    .map(([id, c]) => ({ paperId: Number(id), where: '', label: '', ...c }))
    .sort((a, b) => a.paperId - b.paperId)

  function saveCitations(items) {
    const out = {}
    for (const c of items) {
      if (out[c.paperId]) throw new Error($t('md.citeExists', { id: c.paperId }))
      out[c.paperId] = { where: c.where, label: c.label, text: c.text }
    }
    return saveTo('citations', out)
  }

  $: pipelineFields = [
    { key: 'step', label: $t('md.f.step'), type: 'number', min: 0, required: true, hint: $t('md.f.stepHint') },
    { key: 'label', label: $t('md.f.stepLabel'), type: 'text', required: true },
    { key: 'sublabel', label: $t('md.f.sublabel'), type: 'text' },
    { key: 'color', label: $t('md.f.color'), type: 'color' },
    { key: 'domain', label: $t('col.domain'), type: 'select', options: [{ value: null, label: $t('md.f.none') }, ...domainOptions] },
    { key: 'papers', label: $t('md.f.paperNums'), type: 'numbers' },
    { key: 'note', label: $t('md.f.note'), type: 'textarea', rows: 2 },
  ]

  $: rejectedFields = [
    { key: 'id', label: $t('md.f.id'), type: 'text', required: true, placeholder: 'x1' },
    { key: 'status', label: $t('md.f.status'), type: 'select', options: [
      { value: 'rejected', label: $t('md.f.rejRejected') },
      { value: 'removed', label: $t('md.f.rejRemoved') },
    ] },
    { key: 'batch', label: $t('md.f.batch'), type: 'text', placeholder: '2026-01', hint: $t('md.f.batchHint') },
    { key: 'title', label: $t('col.title'), type: 'text', required: true, wide: true },
    { key: 'authors', label: $t('col.authors'), type: 'text' },
    { key: 'venue', label: $t('col.venue'), type: 'text' },
    { key: 'year', label: $t('col.year'), type: 'number', hint: $t('md.f.yearHint') },
    { key: 'freedNumber', label: $t('md.f.freed'), type: 'number', hint: $t('md.f.freedHint') },
    { key: 'reason', label: $t('md.f.reason'), type: 'textarea', rows: 2 },
  ]

  $: sections = [
    { id: 'papers', label: $t('tab.papers'), count: papers.length },
    { id: 'domains', label: $t('md.sec.domains'), count: domains.length },
    { id: 'comparison', label: $t('tab.compare'), count: dimensions.length },
    { id: 'gaps', label: $t('md.sec.gaps'), count: gaps.length },
    { id: 'citations', label: $t('tab.cite'), count: citationItems.length },
    { id: 'pipeline', label: $t('tab.stack'), count: pipeline.length },
    { id: 'rejected', label: $t('md.sec.rejected'), count: rejected.length },
    { id: 'settings', label: $t('md.sec.settings') },
  ]
</script>

<section class="manage">
  <p class="intro">{$t('md.intro1')} <code>*.json.bak</code>.</p>

  <nav class="tabs">
    {#each sections as s}
      <button class="tab" class:active={section === s.id} on:click={() => (section = s.id)}>
        {s.label}{#if s.count !== undefined}<span class="tab-count">{s.count}</span>{/if}
      </button>
    {/each}
  </nav>

  {#if section === 'papers'}
    {#if !domains.length}
      <div class="msg error">{$t('md.needDomain')}</div>
    {:else}
      <CollectionEditor
        items={papers}
        fields={paperFields}
        addLabel={$t('md.addPaper')}
        itemTitle={(p) => `#${p.num ?? p.id} ${p.title}`}
        itemMeta={(p) => $t('md.paperMeta', { domain: domainLabel(p.domain), authors: p.authors, venue: p.venue, year: p.year, score: p.score })}
        create={(items) => ({ id: nextId(items), domain: domains[0].id, score: 7, year: new Date().getFullYear(), caution: false, title: '', authors: '', venue: '', doi: '', what: '', how: '', results: '', usage: '', tags: [] })}
        save={(items) => saveTo('papers', items)}
      />
      <p class="foot">{$t('md.paperFoot')}</p>
    {/if}
  {:else if section === 'domains'}
    <CollectionEditor
      items={domains}
      fields={domainFields}
      addLabel={$t('md.addDomain')}
      itemTitle={(d) => `D${d.id} ${d.label}`}
      itemMeta={(d) => $t('md.domainMeta', { n: d.papers?.length ?? 0, target: d.target, slug: d.slug })}
      create={(items) => {
        const id = nextId(items)
        return { id, slug: `domain-${id}`, color: PALETTE[(id - 1) % PALETTE.length], label: '', fullLabel: '', description: '', target: 5, keywords: [] }
      }}
      save={(items) => saveTo('domains', items)}
    />
  {:else if section === 'comparison'}
    <ComparisonEditor {papers} {domains} {dimensions} cells={dimensionCells} save={(v) => saveTo('comparison', v)} />
  {:else if section === 'gaps'}
    <CollectionEditor
      items={gaps}
      fields={gapFields}
      addLabel={$t('md.addGap')}
      itemTitle={(g) => `${g.id} ${g.title}`}
      itemMeta={(g) => $t('md.gapMeta', { p: $t(`gap.p.${g.priority}`), s: $t(`gap.s.${g.status}`) })}
      create={(items) => ({ id: nextCode(items, 'G'), title: '', priority: 'medium', status: 'open', description: '', evidence: [], opportunity: '', searchGuidance: '' })}
      save={(items) => saveTo('gaps', items)}
    />
  {:else if section === 'citations'}
    {#if !papers.length}
      <div class="msg error">{$t('md.needPaper')}</div>
    {:else}
      <CollectionEditor
        items={citationItems}
        fields={citationFields}
        addLabel={$t('md.addCitation')}
        itemTitle={(c) => c.label || $t('md.citePaper', { id: c.paperId })}
        itemMeta={(c) => `${$t('md.citePaper', { id: String(c.paperId).padStart(2, '0') })}${c.where ? ` · ${c.where}` : ''}`}
        create={(items) => {
          const used = new Set(items.map((c) => c.paperId))
          const free = paperOptions.find((o) => !used.has(o.value)) ?? paperOptions[0]
          return { paperId: free.value, where: '', label: '', text: '' }
        }}
        save={saveCitations}
      />
    {/if}
  {:else if section === 'pipeline'}
    <CollectionEditor
      items={pipeline}
      fields={pipelineFields}
      addLabel={$t('md.addStep')}
      itemTitle={(l) => `${l.step === 0 ? $t('md.crossCutting') : $t('md.step', { n: l.step })}: ${l.label}`}
      itemMeta={(l) => [l.sublabel, l.papers?.length ? $t('md.stepPapers', { list: l.papers.join(', ') }) : ''].filter(Boolean).join(' · ')}
      create={(items) => ({ step: Math.max(0, ...items.map((l) => l.step)) + 1, label: '', sublabel: '', color: PALETTE[items.length % PALETTE.length], domain: null, papers: [], note: '' })}
      save={(items) => saveTo('pipeline', items)}
    />
  {:else if section === 'rejected'}
    <CollectionEditor
      items={rejected}
      fields={rejectedFields}
      addLabel={$t('md.addRejected')}
      itemTitle={(r) => r.title}
      itemMeta={(r) => [r.status === 'removed' ? $t('rej.removed') : $t('rej.rejected'), r.batch, r.authors, r.year].filter(Boolean).join(' · ')}
      create={(items) => ({ id: nextCode(items, 'x'), status: 'rejected', batch: '', title: '', authors: '', venue: '', year: new Date().getFullYear(), reason: '', freedNumber: null })}
      save={(items) => saveTo('rejected', items)}
    />
  {:else if section === 'settings'}
    <CollectionEditor items={[config]} fields={configFields} single save={(c) => saveTo('config', c)} />
  {/if}
</section>

<style>
  .manage { display: flex; flex-direction: column; gap: 14px; max-width: 1100px; }
  .intro { font-size: 0.8rem; color: var(--text2); line-height: 1.6; }
  code { font-size: 0.76rem; background: var(--surface2); padding: 1px 5px; border-radius: 4px; }
  .tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  .tab {
    padding: 6px 12px; border-radius: var(--radius); border: 1px solid transparent;
    background: none; color: var(--text2); font-size: 0.8rem; cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .tab:hover { background: var(--surface2); }
  .tab.active { background: var(--accent-glow); color: var(--accent); border-color: var(--accent); font-weight: 600; }
  .tab-count { font-size: 0.68rem; color: var(--text3); font-weight: 700; }
  .tab.active .tab-count { color: var(--accent); }
  .foot { font-size: 0.72rem; color: var(--text3); }
</style>
