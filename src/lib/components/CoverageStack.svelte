<script>
  import { t } from '../i18n.js'

  export let stackLayers
  export let domains
  export let title = 'Research Pipeline'
  export let subtitle = ''

  $: pipelineLayers = stackLayers.filter(l => l.step > 0).sort((a,b) => a.step - b.step)
  $: crossCutting = stackLayers.find(l => l.step === 0)

  function pct(domain) {
    return domain.target ? Math.round((domain.papers.length / domain.target) * 100) : 0
  }
</script>

<section class="stack-section">
  <div class="stack-header">
    <h2>{title}</h2>
    {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
  </div>

  <!-- Coverage bars per domain -->
  <div class="coverage-grid">
    {#each domains as domain}
      <div class="coverage-row">
        <div class="cov-label" style="color:{domain.color}">
          <span class="d-num">D{domain.id}</span>
          <span class="d-name">{domain.label}</span>
        </div>
        <div class="cov-bar-wrap">
          <div class="cov-bar">
            <div class="cov-fill" style="width:{Math.min(100, pct(domain))}%;background:{domain.color}"></div>
          </div>
          <span class="cov-count" style="color:{domain.color}">
            {domain.papers.length}/{domain.target}
          </span>
          <span class="cov-pct" style="color:{domain.color}">{pct(domain)}%</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Pipeline layers -->
  <div class="pipeline">
    {#each pipelineLayers as layer}
      <div class="pipeline-step" style="--step-color:{layer.color}">
        <div class="step-num" style="background:{layer.color}15;border-color:{layer.color}40;color:{layer.color}">
          {layer.step}
        </div>
        <div class="step-content">
          <div class="step-label" style="color:{layer.color}">{layer.label}</div>
          <div class="step-sub">{layer.sublabel}</div>
          <div class="step-papers">
            {#each layer.papers as pid}
              <span class="paper-pill" style="border-color:{layer.color}40;color:{layer.color}">#{String(pid).padStart(2,'0')}</span>
            {/each}
          </div>
          <div class="step-note">{layer.note}</div>
        </div>
        {#if layer.step < pipelineLayers.length}
          <div class="step-arrow" style="color:{layer.color}">↓</div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Cross-cutting -->
  {#if crossCutting}
    <div class="cross-cutting" style="--cc-color:{crossCutting.color}">
      <div class="cc-badge" style="color:{crossCutting.color};border-color:{crossCutting.color}40">{$t('cs.cross')}</div>
      <div class="cc-label" style="color:{crossCutting.color}">{crossCutting.label}</div>
      <div class="cc-sub">{crossCutting.sublabel}</div>
      <div class="cc-papers">
        {#each crossCutting.papers as pid}
          <span class="paper-pill" style="border-color:{crossCutting.color}40;color:{crossCutting.color}">#{String(pid).padStart(2,'0')}</span>
        {/each}
      </div>
      <div class="step-note">{crossCutting.note}</div>
    </div>
  {/if}
</section>

<style>
  .stack-section { display: flex; flex-direction: column; gap: 28px; }

  .stack-header h2 { font-size: 1.3rem; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .subtitle { font-size: 0.85rem; color: var(--text2); font-style: italic; }

  /* Coverage bars */
  .coverage-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius2);
    padding: 16px;
  }
  .coverage-row {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 12px;
    align-items: center;
  }
  .cov-label { display: flex; align-items: center; gap: 6px; }
  .d-num { font-size: 0.7rem; font-weight: 700; opacity: 0.7; }
  .d-name { font-size: 0.8rem; font-weight: 600; }
  .cov-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .cov-bar { flex: 1; height: 8px; background: var(--surface2); border-radius: 99px; overflow: hidden; border: 1px solid var(--border); }
  .cov-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .cov-count, .cov-pct { font-size: 0.72rem; font-weight: 700; white-space: nowrap; }
  .cov-pct { opacity: 0.7; min-width: 38px; text-align: right; }

  /* Pipeline */
  .pipeline {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .pipeline-step {
    display: grid;
    grid-template-columns: 40px 1fr 20px;
    gap: 12px;
    align-items: start;
    position: relative;
  }
  .step-num {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 4px;
  }
  .step-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--step-color);
    border-radius: var(--radius);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
  }
  .step-label { font-size: 0.92rem; font-weight: 700; }
  .step-sub { font-size: 0.78rem; color: var(--text2); }
  .step-papers { display: flex; flex-wrap: wrap; gap: 4px; }
  .paper-pill {
    font-size: 0.67rem;
    font-weight: 600;
    padding: 1px 6px;
    border: 1px solid;
    border-radius: 4px;
    opacity: 0.85;
  }
  .step-note { font-size: 0.78rem; color: var(--text3); line-height: 1.45; }
  .step-arrow { font-size: 1.1rem; color: var(--step-color); opacity: 0.5; margin-top: 18px; }

  /* Cross-cutting */
  .cross-cutting {
    background: var(--surface);
    border: 1px dashed var(--cc-color);
    border-radius: var(--radius);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    opacity: 0.9;
  }
  .cc-badge {
    font-size: 0.68rem;
    font-weight: 700;
    border: 1px solid;
    border-radius: 4px;
    display: inline-block;
    padding: 1px 8px;
    width: fit-content;
  }
  .cc-label { font-size: 0.9rem; font-weight: 700; }
  .cc-sub { font-size: 0.78rem; color: var(--text2); }
  .cc-papers { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
