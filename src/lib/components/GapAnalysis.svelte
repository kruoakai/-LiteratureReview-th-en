<script>
  import { t } from '../i18n.js'

  export let gaps

  const priorityColor = p => ({
    critical: '#ef4444',
    high: '#f97316',
    medium: '#fbbf24',
    low: '#6c8fff',
  }[p] || '#9da5cc')

  const PRIORITY_ICON = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }
  $: priorityLabel = p => (PRIORITY_ICON[p] ? `${PRIORITY_ICON[p]} ${$t(`gap.p.${p}`)}` : p)

  $: statusMeta = {
    open:    { label: $t('gap.s.open'),    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)'    },
    partial: { label: $t('gap.s.partial'), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)'   },
    closed:  { label: $t('gap.s.closed'),  color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)'   },
  }

  let filter = 'all'
  $: filtered = filter === 'all' ? gaps : filter === 'open_partial'
    ? gaps.filter(g => g.status !== 'closed')
    : gaps.filter(g => g.priority === filter || g.status === filter)
</script>

<section class="gap-section">
  <div class="gap-header">
    <h2>{$t('gap.title')}</h2>
    <p class="subtitle">{$t('gap.subtitle', { n: gaps.length })}</p>
  </div>

  <!-- Status summary row -->
  <div class="status-summary">
    {#each Object.entries(statusMeta) as [key, meta]}
      {@const count = gaps.filter(g => g.status === key).length}
      <div class="status-chip" style="color:{meta.color};background:{meta.bg};border:1px solid {meta.border}">
        <span class="sc-count">{count}</span>
        <span class="sc-label">{meta.label}</span>
      </div>
    {/each}
  </div>

  <div class="filter-row">
    {#each [['all', $t('common.all')], ['open_partial', $t('gap.f.openPartial')], ['critical', $t('gap.p.critical')], ['high', $t('gap.p.high')], ['medium', $t('gap.p.medium')], ['closed', $t('gap.f.closed')]] as [f, label]}
      <button
        class="filter-btn"
        class:active={filter === f}
        on:click={() => filter = f}
      >{label}</button>
    {/each}
  </div>

  <div class="gaps-list">
    {#each filtered as gap}
      {@const pColor = priorityColor(gap.priority)}
      {@const sMeta = statusMeta[gap.status]}
      <div class="gap-card" class:closed={gap.status === 'closed'} style="--g-color:{pColor}">
        <div class="gap-head">
          <span class="gap-id" style="color:{pColor}">{gap.id}</span>
          <span class="priority-badge" style="color:{pColor};border-color:{pColor}40;background:{pColor}12">{priorityLabel(gap.priority)}</span>
          <span class="status-badge" style="color:{sMeta.color};border-color:{sMeta.border};background:{sMeta.bg}">{sMeta.label}</span>
          <span class="gap-title">{gap.title}</span>
        </div>

        <div class="gap-body">
          <p class="gap-desc">{gap.description}</p>

          <div class="two-col">
            <div class="sub-block">
              <div class="sub-label" style="color:{pColor}">{$t('gap.evidence')}</div>
              <ul class="evidence-list">
                {#each gap.evidence as ev}
                  <li>{ev}</li>
                {/each}
              </ul>
            </div>

            <div class="sub-block">
              <div class="sub-label" style="color:{pColor}">
                {gap.status === 'closed' ? $t('gap.action') : $t('gap.opportunity')}
              </div>
              <p class="opportunity">{gap.opportunity}</p>
            </div>
          </div>

          {#if gap.searchGuidance}
            <div class="search-guidance">
              <span class="sg-label">{$t('gap.search')}</span>
              <span class="sg-text">{gap.searchGuidance}</span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  .gap-section { display: flex; flex-direction: column; gap: 20px; }
  .gap-header h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; }
  .subtitle { font-size: 0.85rem; color: var(--text2); font-style: italic; }

  .status-summary { display: flex; gap: 10px; flex-wrap: wrap; }
  .status-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: var(--radius);
    font-size: 0.78rem;
    font-weight: 600;
  }
  .sc-count { font-size: 1rem; font-weight: 800; }
  .sc-label { opacity: 0.9; }

  .filter-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .filter-btn {
    padding: 5px 13px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text2);
    font-size: 0.78rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition);
  }
  .filter-btn:hover { border-color: var(--border2); color: var(--text); }
  .filter-btn.active { color: var(--accent); border-color: var(--accent); background: var(--accent-glow); }

  .gaps-list { display: flex; flex-direction: column; gap: 12px; }

  .gap-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--g-color);
    border-radius: var(--radius2);
    overflow: hidden;
    transition: opacity var(--transition);
  }
  .gap-card.closed { opacity: 0.65; }
  .gap-card.closed:hover { opacity: 1; }

  .gap-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .gap-id { font-size: 0.78rem; font-weight: 800; min-width: 28px; }
  .priority-badge, .status-badge {
    font-size: 0.68rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid;
    white-space: nowrap;
  }
  .gap-title { font-size: 0.88rem; font-weight: 600; flex: 1; }

  .gap-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
  .gap-desc { font-size: 0.83rem; color: var(--text2); line-height: 1.55; }

  .two-col {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }
  .sub-block { display: flex; flex-direction: column; gap: 6px; }
  .sub-label { font-size: 0.67rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }

  .evidence-list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .evidence-list li {
    font-size: 0.8rem; color: var(--text2); padding-left: 12px; position: relative; line-height: 1.45;
  }
  .evidence-list li::before { content: '›'; position: absolute; left: 0; color: var(--g-color); opacity: 0.7; }

  .opportunity {
    font-size: 0.81rem; color: var(--text); line-height: 1.5;
    background: var(--surface2); border-radius: var(--radius); padding: 8px 10px;
  }

  .search-guidance {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 12px;
    font-size: 0.78rem;
  }
  .sg-label {
    font-weight: 700;
    color: var(--accent2);
    white-space: nowrap;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-top: 1px;
  }
  .sg-text { color: var(--text3); line-height: 1.45; }
</style>
