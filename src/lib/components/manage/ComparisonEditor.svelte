<script>
  import { t } from '../../i18n.js'

  export let papers = []
  export let domains = []
  export let dimensions = []
  export let cells = {} // cells[domainId][paperId][dimensionIndex] = { status, note }
  export let save

  $: STATUSES = [
    { value: 'yes', label: `✓ ${$t('dct.yes')}` },
    { value: 'partial', label: `◑ ${$t('dct.partial')}` },
    { value: 'note', label: `· ${$t('dct.note')}` },
    { value: 'no', label: `— ${$t('dct.no')}` },
  ]

  let dims = []
  let grid = {} // grid[paperId][dimIndex] = { status, note }
  let dirty = false
  let saving = false
  let error = ''
  let ok = ''
  let activeDomain = domains[0]?.id

  // Cells are looked up under the paper's current domain first, then any domain, so a paper that
  // was moved to another domain keeps its scores; saving re-files them under the current domain.
  function lookup(paper, di) {
    const own = cells[paper.domain]?.[paper.id]?.[di]
    if (own) return own
    for (const byPaper of Object.values(cells)) if (byPaper?.[paper.id]?.[di]) return byPaper[paper.id][di]
    return null
  }

  function init() {
    dims = [...dimensions]
    grid = {}
    for (const p of papers) {
      grid[p.id] = dims.map((_, di) => {
        const c = lookup(p, di)
        return { status: c?.status || 'no', note: c?.note || '' }
      })
    }
    dirty = false
  }

  $: if (!dirty) (papers, dimensions, cells, init())

  function touch() {
    dirty = true
    ok = ''
  }

  function addDimension() {
    dims = [...dims, '']
    for (const id in grid) grid[id] = [...grid[id], { status: 'no', note: '' }]
    touch()
  }

  function removeDimension(i) {
    if (!confirm($t('cmp.confirmRemove', { name: dims[i] || $t('cmp.thisDimension') }))) return
    dims = dims.filter((_, j) => j !== i)
    for (const id in grid) grid[id] = grid[id].filter((_, j) => j !== i)
    touch()
  }

  function moveDimension(i, delta) {
    const j = i + delta
    if (j < 0 || j >= dims.length) return
    const swap = (arr) => { const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a }
    dims = swap(dims)
    for (const id in grid) grid[id] = swap(grid[id])
    touch()
  }

  async function submit() {
    error = ''
    ok = ''
    if (dims.some((d) => !d.trim())) {
      error = $t('cmp.needName')
      return
    }
    const out = {}
    for (const p of papers) {
      ;(grid[p.id] || []).forEach((c, di) => {
        if (c.status === 'no' && !c.note.trim()) return
        ;((out[p.domain] ??= {})[p.id] ??= {})[di] = c.note.trim() ? { status: c.status, note: c.note.trim() } : { status: c.status }
      })
    }
    saving = true
    try {
      await save({ dimensions: dims.map((d) => d.trim()), cells: out })
      dirty = false
      ok = $t('common.saved')
    } catch (e) {
      error = e.message
    } finally {
      saving = false
    }
  }

  $: rows = papers.filter((p) => p.domain === activeDomain).sort((a, b) => a.id - b.id)
</script>

<div class="cmp">
  <div class="block">
    <div class="block-head">
      <h3>{$t('cmp.dims')}</h3>
      <p class="hint">{$t('cmp.dimsHint')}</p>
    </div>
    <div class="dims">
      {#each dims as dim, i}
        <div class="dim-row">
          <span class="dim-num">{i + 1}</span>
          <input type="text" bind:value={dims[i]} on:input={touch} placeholder={$t('cmp.dimName')} />
          <button class="btn" on:click={() => moveDimension(i, -1)} disabled={i === 0} aria-label={$t('cmp.up')}>↑</button>
          <button class="btn" on:click={() => moveDimension(i, 1)} disabled={i === dims.length - 1} aria-label={$t('cmp.down')}>↓</button>
          <button class="btn ghost-danger" on:click={() => removeDimension(i)} aria-label={$t('cmp.remove')}>✕</button>
        </div>
      {/each}
      <button class="btn" on:click={addDimension}>{$t('cmp.addDim')}</button>
    </div>
  </div>

  <div class="block">
    <div class="block-head">
      <h3>{$t('cmp.scores')}</h3>
      <p class="hint">{$t('cmp.scoresHint')}</p>
    </div>
    <div class="domain-chips">
      {#each domains as d}
        <button class="chip" class:active={activeDomain === d.id} style="--c:{d.color}" on:click={() => (activeDomain = d.id)}>
          D{d.id} {d.label}
        </button>
      {/each}
    </div>

    {#if !dims.length}
      <div class="empty">{$t('cmp.needDim')}</div>
    {:else if !rows.length}
      <div class="empty">{$t('cmp.noPapers')}</div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="paper-col">{$t('col.paper')}</th>
              {#each dims as dim}<th>{dim || $t('cmp.unnamed')}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each rows as p (p.id)}
              <tr>
                <td class="paper-col">
                  <div class="p-title">#{p.num} {p.title}</div>
                  <div class="p-meta">{p.authors} ({p.year})</div>
                </td>
                {#each grid[p.id] || [] as cell}
                  <td>
                    <select bind:value={cell.status} on:change={touch} class="st-{cell.status}">
                      {#each STATUSES as s}<option value={s.value}>{s.label}</option>{/each}
                    </select>
                    <input type="text" bind:value={cell.note} on:input={touch} placeholder={$t('cmp.notePh')} />
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  {#if error}<div class="msg error">{error}</div>{/if}
  {#if ok}<div class="msg ok">{ok}</div>{/if}
  <div class="actions">
    <button class="btn primary" on:click={submit} disabled={saving || !dirty}>{saving ? $t('common.saving') : $t('cmp.save')}</button>
    {#if dirty}
      <button class="btn" on:click={init}>{$t('cmp.discard')}</button>
      <span class="unsaved">{$t('cmp.unsaved')}</span>
    {/if}
  </div>
</div>

<style>
  .cmp { display: flex; flex-direction: column; gap: 14px; }
  .block {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 16px; display: flex; flex-direction: column; gap: 12px;
  }
  h3 { font-size: 0.92rem; font-weight: 700; }
  .hint { font-size: 0.74rem; color: var(--text3); }

  input[type='text'], select {
    padding: 6px 8px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.8rem; outline: none; font-family: inherit;
  }
  input:focus, select:focus { border-color: var(--accent); }

  .dims { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
  .dim-row { display: flex; gap: 6px; align-items: center; width: 100%; max-width: 560px; }
  .dim-row input { flex: 1; }
  .dim-num { font-size: 0.72rem; color: var(--text3); width: 18px; text-align: right; }

  .domain-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip {
    padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; cursor: pointer;
    background: var(--surface2); border: 1px solid var(--border); color: var(--text2);
  }
  .chip.active { border-color: var(--c); color: var(--c); font-weight: 600; }

  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; font-size: 0.78rem; }
  th, td { border: 1px solid var(--border); padding: 6px; vertical-align: top; }
  th { background: var(--surface2); color: var(--text2); font-weight: 600; text-align: left; min-width: 150px; }
  td { min-width: 150px; }
  td select, td input { width: 100%; display: block; }
  td select { margin-bottom: 4px; }
  .paper-col { min-width: 220px; max-width: 280px; position: sticky; left: 0; background: var(--surface); z-index: 1; }
  th.paper-col { background: var(--surface2); }
  .p-title { font-weight: 600; color: var(--text); line-height: 1.3; }
  .p-meta { color: var(--text3); font-size: 0.72rem; }
  .st-yes { color: var(--success); }
  .st-partial { color: var(--tag-warn-text); }
  .st-note { color: var(--accent); }

  .empty { font-size: 0.82rem; color: var(--text3); padding: 16px; text-align: center; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .unsaved { font-size: 0.75rem; color: var(--tag-warn-text); }
</style>
