<script>
  import { t } from '../i18n.js'

  export let papers
  export let domains

  // ── Chart 1: papers per domain ──
  $: domainData = domains.map(d => ({
    id: d.id,
    name: `D${d.id}`,
    fullName: d.fullLabel,
    color: d.color,
    count: d.papers.length,
    target: d.target,
  }))

  // ── Chart 2: relevance score distribution ──
  // Sequential blue ramp, light→dark, ordinal steps 250→550 (dark-surface safe: never darker than step 600)
  const scoreRamp = {
    1: '#b3d0f5',
    2: '#9cc3f2',
    3: '#86b6ef',
    4: '#6da7ec',
    5: '#5598e7',
    6: '#3987e5',
    7: '#2a78d6',
    8: '#256abf',
    9: '#1c5cab',
    10: '#174f94',
  }
  $: scoreData = (() => {
    const scoreCounts = {}
    papers.forEach(p => { scoreCounts[p.score] = (scoreCounts[p.score] || 0) + 1 })
    return Object.keys(scoreRamp).map(s => ({
      score: Number(s),
      count: scoreCounts[s] || 0,
      color: scoreRamp[s],
    }))
  })()

  let domainTable = false
  let scoreTable = false
  let hover = null // { chart: 'domain'|'score', index, x, y }

  function showHover(chart, index, evt) {
    const rect = evt.currentTarget.closest('.chart-svg-wrap').getBoundingClientRect()
    hover = {
      chart,
      index,
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    }
  }
  function hideHover() { hover = null }

  const W = 640, H = 260
  const padL = 34, padR = 12, padT = 20, padB = 40

  function makeBars(data, valueKey, maxOverride) {
    const max = maxOverride ?? Math.max(...data.map(d => d[valueKey]), 1)
    const niceMax = Math.ceil(max / 5) * 5 || 5
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const slot = innerW / data.length
    const barW = Math.min(40, slot * 0.5)
    return data.map((d, i) => {
      const val = d[valueKey]
      const h = (val / niceMax) * innerH
      const x = padL + i * slot + (slot - barW) / 2
      const y = padT + innerH - h
      return { ...d, x, y, w: barW, h, cx: x + barW / 2 }
    })
  }

  $: domainBars = makeBars(domainData, 'count')
  $: domainMax = Math.max(...domainData.map(d => Math.max(d.count, d.target)))
  $: domainNiceMax = Math.ceil(domainMax / 5) * 5 || 5
  $: domainBarsWithTarget = domainBars.map(b => ({
    ...b,
    targetY: padT + (H - padT - padB) - (b.target / domainNiceMax) * (H - padT - padB),
  }))

  $: scoreBars = makeBars(scoreData, 'count')
  $: scoreMax = Math.max(...scoreData.map(d => d.count))
  $: scoreNiceMax = Math.ceil(scoreMax / 5) * 5 || 5

  function gridLines(niceMax, step) {
    const lines = []
    for (let v = 0; v <= niceMax; v += step) lines.push(v)
    return lines
  }
  $: domainGrid = gridLines(domainNiceMax, Math.max(5, Math.ceil(domainNiceMax / 4 / 5) * 5))
  $: scoreGrid = gridLines(scoreNiceMax, Math.max(5, Math.ceil(scoreNiceMax / 4 / 5) * 5))

  function yFor(v, niceMax) {
    return padT + (H - padT - padB) - (v / niceMax) * (H - padT - padB)
  }

  const totalPapers = papers.length
  const totalTarget = domains.reduce((s, d) => s + d.target, 0)
</script>

<section class="charts-section">
  <div class="charts-header">
    <h2>{$t('title.charts')}</h2>
    <p class="subtitle">{$t('ch.subtitle', { n: totalPapers, target: totalTarget })}</p>
  </div>

  <!-- ── Chart 1: papers per domain ── -->
  <div class="chart-card">
    <div class="chart-card-head">
      <div>
        <h3>{$t('ch.perDomain')}</h3>
        <p class="chart-sub">{$t('ch.perDomainSub', { target: totalTarget })}</p>
      </div>
      <button class="table-toggle" on:click={() => domainTable = !domainTable}>
        {domainTable ? $t('ch.chartView') : $t('ch.tableView')}
      </button>
    </div>

    {#if !domainTable}
      <div class="chart-svg-wrap">
        <svg viewBox="0 0 {W} {H}" class="chart-svg" role="img" aria-label={$t('ch.domainAria')}>
          {#each domainGrid as g}
            <line x1={padL} x2={W - padR} y1={yFor(g, domainNiceMax)} y2={yFor(g, domainNiceMax)} class="gridline" />
            <text x={padL - 8} y={yFor(g, domainNiceMax) + 3} class="axis-label" text-anchor="end">{g}</text>
          {/each}

          {#each domainBarsWithTarget as b, i}
            <!-- target tick -->
            <line x1={b.x - 2} x2={b.x + b.w + 2} y1={b.targetY} y2={b.targetY} class="target-line" />

            <rect
              x={b.x} y={b.y} width={b.w} height={Math.max(b.h, 1)}
              rx="4" fill={b.color}
              class="bar"
              class:dim={hover && hover.chart === 'domain' && hover.index !== i}
              on:mouseenter={(e) => showHover('domain', i, e)}
              on:mouseleave={hideHover}
              on:focus={(e) => showHover('domain', i, e)}
              on:blur={hideHover}
              tabindex="0"
              role="button"
              aria-label={$t('ch.barAria', { name: b.fullName, n: b.count, target: b.target })}
            />
            <text x={b.cx} y={b.y - 6} class="value-label" text-anchor="middle">{b.count}</text>
            <text x={b.cx} y={H - padB + 16} class="cat-label" text-anchor="middle">{b.name}</text>
            <text x={b.cx} y={H - padB + 29} class="cat-sub" text-anchor="middle">{b.fullName.split(' ')[0]}</text>
          {/each}
        </svg>

        {#if hover && hover.chart === 'domain'}
          {@const d = domainBarsWithTarget[hover.index]}
          <div class="tooltip" style="left:{hover.x}px; top:{hover.y}px;">
            <div class="tt-title" style="color:{d.color}">{d.fullName}</div>
            <div class="tt-row">{$t('ch.domainTip', { n: d.count, target: d.target, pct: Math.round((d.count / d.target) * 100) })}</div>
          </div>
        {/if}
      </div>
    {:else}
      <table class="data-table">
        <thead><tr><th>{$t('col.domain')}</th><th>{$t('col.papers')}</th><th>{$t('col.target')}</th><th>%</th></tr></thead>
        <tbody>
          {#each domainData as d}
            <tr>
              <td><span class="dot" style="background:{d.color}"></span>{d.name} — {d.fullName}</td>
              <td>{d.count}</td>
              <td>{d.target}</td>
              <td>{Math.round((d.count / d.target) * 100)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- ── Chart 2: relevance score distribution ── -->
  <div class="chart-card">
    <div class="chart-card-head">
      <div>
        <h3>{$t('ch.scoreDist')}</h3>
        <p class="chart-sub">{$t('ch.scoreSub', { n: totalPapers })}</p>
      </div>
      <button class="table-toggle" on:click={() => scoreTable = !scoreTable}>
        {scoreTable ? $t('ch.chartView') : $t('ch.tableView')}
      </button>
    </div>

    {#if !scoreTable}
      <div class="chart-svg-wrap">
        <svg viewBox="0 0 {W} {H}" class="chart-svg" role="img" aria-label={$t('ch.scoreAria')}>
          {#each scoreGrid as g}
            <line x1={padL} x2={W - padR} y1={yFor(g, scoreNiceMax)} y2={yFor(g, scoreNiceMax)} class="gridline" />
            <text x={padL - 8} y={yFor(g, scoreNiceMax) + 3} class="axis-label" text-anchor="end">{g}</text>
          {/each}

          {#each scoreBars as b, i}
            <rect
              x={b.x} y={b.y} width={b.w} height={Math.max(b.h, 1)}
              rx="4" fill={b.color}
              class="bar"
              class:dim={hover && hover.chart === 'score' && hover.index !== i}
              on:mouseenter={(e) => showHover('score', i, e)}
              on:mouseleave={hideHover}
              on:focus={(e) => showHover('score', i, e)}
              on:blur={hideHover}
              tabindex="0"
              role="button"
              aria-label={$t('ch.scoreBarAria', { s: b.score, n: b.count })}
            />
            {#if b.count > 0}
              <text x={b.cx} y={b.y - 6} class="value-label" text-anchor="middle">{b.count}</text>
            {/if}
            <text x={b.cx} y={H - padB + 16} class="cat-label" text-anchor="middle">{b.score}/10</text>
          {/each}
        </svg>

        {#if hover && hover.chart === 'score'}
          {@const d = scoreBars[hover.index]}
          <div class="tooltip" style="left:{hover.x}px; top:{hover.y}px;">
            <div class="tt-title" style="color:{d.color}">{$t('ch.scoreTip', { s: d.score })}</div>
            <div class="tt-row">{$t('ch.scoreTipRow', { n: d.count, pct: Math.round((d.count / totalPapers) * 100) })}</div>
          </div>
        {/if}
      </div>
    {:else}
      <table class="data-table">
        <thead><tr><th>{$t('ch.score')}</th><th>{$t('col.papers')}</th><th>%</th></tr></thead>
        <tbody>
          {#each scoreData as d}
            <tr>
              <td><span class="dot" style="background:{d.color}"></span>{d.score}/10</td>
              <td>{d.count}</td>
              <td>{Math.round((d.count / totalPapers) * 100)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

<style>
  .charts-section { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 960px) {
    .charts-section { grid-template-columns: 1fr 1fr; align-items: start; }
  }
  .charts-header { grid-column: 1 / -1; }
  .charts-header h2 { font-size: 1.3rem; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .subtitle { font-size: 0.85rem; color: var(--text2); }

  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius2);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .chart-card-head {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  }
  .chart-card-head h3 { font-size: 0.95rem; font-weight: 700; color: var(--text); }
  .chart-sub { font-size: 0.75rem; color: var(--text3); margin-top: 2px; }

  .table-toggle {
    padding: 5px 12px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text2); font-size: 0.74rem; cursor: pointer;
    white-space: nowrap; transition: all var(--transition);
  }
  .table-toggle:hover { border-color: var(--accent); color: var(--accent); }

  .chart-svg-wrap { position: relative; width: 100%; max-width: 640px; margin: 0 auto; }
  .chart-svg { width: 100%; height: auto; display: block; overflow: visible; }

  .gridline { stroke: var(--border); stroke-width: 1; }
  .axis-label { fill: var(--text3); font-size: 9px; }
  .cat-label { fill: var(--text2); font-size: 10px; font-weight: 600; }
  .cat-sub { fill: var(--text3); font-size: 8px; }
  .value-label { fill: var(--text); font-size: 10px; font-weight: 700; }
  .target-line { stroke: var(--text3); stroke-width: 1.5; stroke-dasharray: 3 2; }

  .bar { cursor: pointer; transition: opacity 0.15s ease; outline: none; }
  .bar.dim { opacity: 0.35; }

  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%) translateY(-10px);
    background: var(--surface3);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    padding: 8px 10px;
    font-size: 0.74rem;
    white-space: nowrap;
    pointer-events: none;
    z-index: 20;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
  }
  .tt-title { font-weight: 700; margin-bottom: 2px; }
  .tt-row { color: var(--text2); }

  .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .data-table th {
    text-align: left; padding: 8px 10px; color: var(--text3);
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid var(--border);
  }
  .data-table td { padding: 7px 10px; border-bottom: 1px solid var(--border); color: var(--text2); }
  .data-table tr:last-child td { border-bottom: none; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }

  @media (max-width: 640px) {
    .cat-sub { display: none; }
  }
</style>
