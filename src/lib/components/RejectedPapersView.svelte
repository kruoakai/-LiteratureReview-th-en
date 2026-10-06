<script>
  import { t } from '../i18n.js'

  export let rejected = []
  export let totalIncluded = 0

  $: statusMeta = {
    rejected: { label: $t('rej.statusRejected'), color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    removed:  { label: $t('rej.statusRemoved'), color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  }
  const ACCEPTED_COLOR = '#34d399'

  let filter = 'all'
  $: filtered = filter === 'all' ? rejected : rejected.filter(p => p.status === filter)

  $: rejectedOutright = rejected.filter(p => p.status === 'rejected').length
  $: removedAfterInclusion = rejected.filter(p => p.status === 'removed').length
  $: totalReviewed = totalIncluded + rejected.length

  $: acceptedPct = totalReviewed ? (totalIncluded / totalReviewed) * 100 : 0
  $: rejectedPct = totalReviewed ? (rejectedOutright / totalReviewed) * 100 : 0
  $: removedPct = totalReviewed ? (removedAfterInclusion / totalReviewed) * 100 : 0

  $: legend = [
    { key: 'accepted', color: ACCEPTED_COLOR, label: $t('rej.included'), desc: $t('rej.includedDesc') },
    { key: 'rejected', color: statusMeta.rejected.color, label: $t('rej.rejected'), desc: $t('rej.rejectedDesc') },
    { key: 'removed', color: statusMeta.removed.color, label: $t('rej.removed'), desc: $t('rej.removedDesc') },
  ]
</script>

<section class="rj-section">
  <div class="rj-header">
    <h2>{$t('rej.title')}</h2>
    <p class="subtitle">{$t('rej.subtitle')}</p>
  </div>

  <div class="rj-progress">
    <div class="prog-label">{$t('rej.allRead')}</div>
    <div class="prog-bar">
      <div class="prog-seg" style="width:{acceptedPct}%; background:{ACCEPTED_COLOR}" title="{$t('rej.included')} {totalIncluded}"></div>
      <div class="prog-seg" style="width:{rejectedPct}%; background:{statusMeta.rejected.color}" title="{$t('rej.rejected')} {rejectedOutright}"></div>
      <div class="prog-seg" style="width:{removedPct}%; background:{statusMeta.removed.color}" title="{$t('rej.removed')} {removedAfterInclusion}"></div>
    </div>
    <div class="prog-count">{$t('rej.totalRead', { n: totalReviewed })}</div>

    <div class="rj-legend">
      {#each legend as item}
        <div class="legend-item">
          <span class="legend-dot" style="background:{item.color}"></span>
          <div class="legend-text">
            <div class="legend-title-row">
              <span class="legend-label">{item.label}</span>
              <span class="legend-count" style="color:{item.color}">
                {item.key === 'accepted' ? totalIncluded : item.key === 'rejected' ? rejectedOutright : removedAfterInclusion}
              </span>
            </div>
            <span class="legend-desc">{item.desc}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="filter-row">
    {#each [['all', $t('common.all'), rejected.length], ['rejected', $t('rej.rejected'), rejectedOutright], ['removed', $t('rej.removed'), removedAfterInclusion]] as [f, label, n]}
      <button class="filter-btn" class:active={filter === f} on:click={() => filter = f}>{$t('rej.filter', { label, n })}</button>
    {/each}
  </div>

  <div class="rj-list">
    {#each filtered as p}
      {@const meta = statusMeta[p.status]}
      <div class="rj-card" style="--r-color:{meta.color}">
        <div class="rj-head">
          <span class="status-badge" style="color:{meta.color};border-color:{meta.border};background:{meta.bg}">{meta.label}</span>
          {#if p.freedNumber}<span class="freed-badge">{$t('rej.freed', { n: p.freedNumber })}</span>{/if}
          <span class="rj-batch">{p.batch}</span>
        </div>
        <div class="rj-body">
          <div class="rj-title">{p.title}</div>
          <div class="rj-meta">{p.authors} · <span class="rj-venue">{p.venue}</span> · {p.year}</div>
          <p class="rj-reason">{p.reason}</p>
        </div>
      </div>
    {/each}
    {#if filtered.length === 0}
      <div class="empty">{$t('rej.empty')}</div>
    {/if}
  </div>
</section>

<style>
  .rj-section { display: flex; flex-direction: column; gap: 20px; }
  .rj-header h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; }
  .subtitle { font-size: 0.85rem; color: var(--text2); max-width: 720px; line-height: 1.5; }

  .rj-progress {
    display: flex; flex-direction: column; gap: 8px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 16px 18px;
  }
  .prog-label { font-size: 0.67rem; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; }
  .prog-bar { height: 10px; background: var(--surface2); border-radius: 99px; overflow: hidden; display: flex; }
  .prog-seg { height: 100%; transition: width 0.8s ease; }
  .prog-count { font-size: 0.78rem; color: var(--text2); font-weight: 600; }

  .rj-legend {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px; margin-top: 6px; padding-top: 14px; border-top: 1px solid var(--border);
  }
  .legend-item { display: flex; align-items: flex-start; gap: 8px; }
  .legend-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
  .legend-text { display: flex; flex-direction: column; gap: 2px; }
  .legend-title-row { display: flex; align-items: baseline; gap: 6px; }
  .legend-label { font-size: 0.82rem; font-weight: 700; color: var(--text); }
  .legend-count { font-size: 0.82rem; font-weight: 800; }
  .legend-desc { font-size: 0.75rem; color: var(--text3); line-height: 1.4; }

  .filter-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .filter-btn {
    padding: 5px 13px; border-radius: 99px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text2); font-size: 0.78rem; font-weight: 500;
    cursor: pointer; transition: all var(--transition);
  }
  .filter-btn:hover { border-color: var(--border2); color: var(--text); }
  .filter-btn.active { color: var(--accent); border-color: var(--accent); background: var(--accent-glow); }

  .rj-list { display: flex; flex-direction: column; gap: 10px; }

  .rj-card {
    background: var(--surface); border: 1px solid var(--border);
    border-left: 3px solid var(--r-color); border-radius: var(--radius2);
    overflow: hidden;
  }
  .rj-head {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 16px; border-bottom: 1px solid var(--border);
  }
  .status-badge {
    font-size: 0.68rem; font-weight: 600; padding: 2px 8px;
    border-radius: 99px; border: 1px solid; white-space: nowrap;
  }
  .freed-badge {
    font-size: 0.68rem; font-weight: 700; padding: 2px 8px;
    border-radius: 99px; color: var(--text3); background: var(--surface2);
    border: 1px solid var(--border);
  }
  .rj-batch { font-size: 0.72rem; color: var(--text3); margin-left: auto; font-variant-numeric: tabular-nums; }

  .rj-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
  .rj-title { font-size: 0.9rem; font-weight: 700; color: var(--text); }
  .rj-meta { font-size: 0.78rem; color: var(--text3); }
  .rj-venue { font-style: italic; }
  .rj-reason { font-size: 0.82rem; color: var(--text2); line-height: 1.55; }

  .empty { text-align: center; color: var(--text3); font-style: italic; padding: 24px; }
</style>
