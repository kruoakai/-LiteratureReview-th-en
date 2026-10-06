<script>
  import { t } from '../i18n.js'

  export let citations
  export let papers
  export let domains

  $: paperMap = Object.fromEntries(papers.map(p => [p.id, p]))
  $: domainMap = Object.fromEntries(domains.map(d => [d.id, d]))

  // Build ordered list (by paper id for display consistency)
  $: citationList = Object.entries(citations)
    .map(([id, c]) => ({ ...c, paperId: Number(id), paper: paperMap[Number(id)] }))
    .filter(c => c.paper)
    .sort((a, b) => {
      // sort by section label alphabetically
      return a.where.localeCompare(b.where)
    })

  let copied = null

  function copyText(text, id) {
    navigator.clipboard?.writeText(text.replace(/^"|"$/g, '').trim())
    copied = id
    setTimeout(() => copied = null, 2000)
  }

  const scoreColor = s => {
    if (s >= 9) return 'var(--score9)'
    if (s >= 8) return 'var(--score8)'
    if (s >= 7) return 'var(--score7)'
    return 'var(--score5)'
  }
</script>

<section class="cv-section">
  <div class="cv-header">
    <h2>{$t('title.cite')}</h2>
    <p class="subtitle">{$t('cite.subtitle')}</p>
  </div>

  <div class="citations-list">
    {#each citationList as c (c.paperId)}
      {@const domain = c.paper ? domainMap[c.paper.domain] : null}
      <div class="citation-card">
        <div class="cit-where">{c.where}</div>

        <div class="cit-meta">
          <span class="cit-num" style="color:{scoreColor(c.paper?.score ?? 0)}">
            #{c.paper?.num ?? '??'}
          </span>
          {#if domain}
            <span class="cit-domain-pip" style="background:{domain.color}">D{domain.id}</span>
          {/if}
          <span class="cit-label">{c.label}</span>
        </div>

        <div class="cit-block">
          <p class="cit-text">{c.text}</p>
          <button
            class="copy-btn"
            class:copied={copied === c.paperId}
            on:click={() => copyText(c.text, c.paperId)}
          >
            {copied === c.paperId ? $t('cite.copied') : $t('cite.copy')}
          </button>
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  .cv-section { display: flex; flex-direction: column; gap: 20px; }
  .cv-header h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 6px; }
  .subtitle { font-size: 0.85rem; color: var(--text2); font-style: italic; }

  .citations-list { display: flex; flex-direction: column; gap: 14px; }

  .citation-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 0 var(--radius2) var(--radius2) 0;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cit-where {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--accent);
  }

  .cit-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .cit-num { font-size: 0.75rem; font-weight: 800; }
  .cit-domain-pip {
    font-size: 0.62rem;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 3px;
    color: #000;
    opacity: 0.8;
  }
  .cit-label { font-size: 0.84rem; font-weight: 600; color: var(--text); flex: 1; }

  .cit-block {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    position: relative;
  }

  .cit-text {
    font-size: 0.83rem;
    color: var(--text2);
    font-style: italic;
    line-height: 1.65;
    padding-right: 60px;
  }

  .copy-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    background: var(--surface3);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    color: var(--text2);
    font-size: 0.72rem;
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
  }
  .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
  .copy-btn.copied { border-color: var(--score8); color: var(--score8); background: rgba(52,211,153,0.1); }
</style>
