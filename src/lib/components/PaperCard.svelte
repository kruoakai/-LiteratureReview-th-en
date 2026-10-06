<script>
  import { t } from '../i18n.js'

  export let paper
  export let domains
  export let expanded = false

  $: domainMap = Object.fromEntries(domains.map(d => [d.id, d]))
  $: domain = domainMap[paper.domain]

  const scoreColor = s => {
    if (s >= 9) return 'var(--score9)'
    if (s >= 8) return 'var(--score8)'
    if (s >= 7) return 'var(--score7)'
    if (s >= 6) return 'var(--score6)'
    if (s >= 5) return 'var(--score5)'
    return 'var(--score3)'
  }

  function toggle() { expanded = !expanded }
</script>

<article class="card" class:expanded style="--d-color: {domain.color}">
  <!-- header row -->
  <button class="card-head" on:click={toggle} aria-expanded={expanded}>
    <span class="num">#{paper.num}</span>

    <span class="score-badge" style="color:{scoreColor(paper.score)};border-color:{scoreColor(paper.score)}20;background:{scoreColor(paper.score)}15">
      {paper.score}/10
    </span>

    <span class="domain-pip" style="background:{domain.color}" title="{domain.fullLabel}">D{paper.domain}</span>

    <span class="title-wrap">
      <span class="title">{paper.title}</span>
      {#if paper.caution}
        <span class="badge caution">{$t('card.caution')}</span>
      {/if}
    </span>

    <span class="meta">{paper.authors} · {paper.venue} {paper.year}</span>

    <span class="chevron" class:open={expanded}>▾</span>
  </button>

  <!-- collapsible body -->
  {#if expanded}
    <div class="card-body">
      <div class="section-grid">
        <div class="info-block">
          <div class="info-label">{$t('card.what')}</div>
          <div class="info-text">{paper.what}</div>
        </div>
        <div class="info-block">
          <div class="info-label">{$t('card.how')}</div>
          <div class="info-text">{paper.how}</div>
        </div>
        <div class="info-block">
          <div class="info-label">{$t('card.results')}</div>
          <div class="info-text">{paper.results}</div>
        </div>
      </div>

      <div class="usage-block">
        <div class="info-label">{$t('card.usage')}</div>
        <div class="usage-text">{paper.usage}</div>
      </div>

      <div class="tags-row">
        {#each paper.tags as tag}
          <span class="tag {tag.type === 'yes' ? 'yes' : tag.type === 'warn' ? 'warn' : 'muted'}">{tag.label}</span>
        {/each}
      </div>

      <div class="links-row">
        {#if paper.doi}
          <a class="doi-link" href="https://doi.org/{paper.doi}" target="_blank" rel="noopener">DOI: {paper.doi} ↗</a>
        {/if}
        {#if paper.hasPdf}
          <a class="pdf-link" href="/api/papers/{paper.id}/pdf" download>{$t('card.pdf')}</a>
        {/if}
      </div>
    </div>
  {/if}
</article>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--d-color);
    border-radius: var(--radius2);
    overflow: hidden;
    transition: border-color var(--transition), box-shadow var(--transition);
  }
  .card:hover {
    border-color: var(--d-color);
    box-shadow: 0 0 0 1px var(--d-color)20;
  }
  .card.expanded { border-color: var(--d-color); }

  .card-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
    flex-wrap: wrap;
  }
  .card-head:hover { background: var(--surface2); }

  .num {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text3);
    min-width: 28px;
  }

  .score-badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 99px;
    border: 1px solid;
    white-space: nowrap;
  }

  .domain-pip {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    color: #000;
    opacity: 0.85;
    white-space: nowrap;
  }

  .title-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
    line-height: 1.3;
  }

  .meta {
    font-size: 0.72rem;
    color: var(--text3);
    white-space: nowrap;
    margin-left: auto;
  }

  .chevron {
    font-size: 1rem;
    color: var(--text3);
    transition: transform var(--transition);
    margin-left: 4px;
    flex-shrink: 0;
  }
  .chevron.open { transform: rotate(180deg); }

  /* body */
  .card-body {
    padding: 0 16px 16px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
    padding-top: 12px;
  }

  .info-block { display: flex; flex-direction: column; gap: 4px; }
  .info-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--d-color);
  }
  .info-text {
    font-size: 0.82rem;
    color: var(--text2);
    line-height: 1.5;
  }

  .usage-block {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .usage-text {
    font-size: 0.82rem;
    color: var(--text);
    line-height: 1.55;
    font-style: italic;
  }

  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .links-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .doi-link {
    font-size: 0.75rem;
    color: var(--accent);
    opacity: 0.8;
  }
  .doi-link:hover { opacity: 1; }

  .pdf-link {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent2);
    padding: 4px 10px;
    border: 1px solid rgba(167,139,250,0.35);
    border-radius: 99px;
    background: rgba(167,139,250,0.1);
  }
  .pdf-link:hover { background: rgba(167,139,250,0.18); text-decoration: none; }
</style>
