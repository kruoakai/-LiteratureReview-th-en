<script>
  import { onMount } from 'svelte'
  import PaperCard from './lib/components/PaperCard.svelte'
  import CoverageStack from './lib/components/CoverageStack.svelte'
  import GapAnalysis from './lib/components/GapAnalysis.svelte'
  import RejectedPapersView from './lib/components/RejectedPapersView.svelte'
  import DomainComparisonTables from './lib/components/DomainComparisonTables.svelte'
  import DomainTables from './lib/components/DomainTables.svelte'
  import CitationsView from './lib/components/CitationsView.svelte'
  import ChartsView from './lib/components/ChartsView.svelte'
  import Login from './lib/components/Login.svelte'
  import AccountPanel from './lib/components/AccountPanel.svelte'
  import ManageData from './lib/components/manage/ManageData.svelte'
  import UsersView from './lib/components/UsersView.svelte'
  import AuditLogView from './lib/components/AuditLogView.svelte'
  import ForcePasswordChange from './lib/components/ForcePasswordChange.svelte'
  import LangToggle from './lib/components/LangToggle.svelte'
  import { me, logout, fetchAppData, can } from './lib/auth.js'
  import { t, fmtDate } from './lib/i18n.js'

  const buildDate = __BUILD_DATE__

  let user = undefined // undefined = checking session, null = signed out, object = signed in
  let showAccount = false

  // index.html sets data-theme before this component mounts, to avoid a flash of the wrong theme.
  let theme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'light'
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch {}
  }

  // The literature-review dataset is only ever fetched after a valid session exists —
  // it must never be bundled into the publicly-served JS (see /api/app-data on the server).
  let appData = null
  $: papers = appData?.papers ?? []
  $: domains = appData?.domains ?? []
  $: rejected = appData?.rejected ?? []
  $: config = appData?.config ?? {}
  $: if (typeof document !== 'undefined' && config.title) document.title = config.title

  async function loadAppData() {
    if (!user || user.mustChangePassword) return
    try {
      appData = await fetchAppData()
    } catch (e) {
      if (e.status === 401) user = null // session ended (signed out elsewhere, disabled, 2FA reset)
    }
  }

  onMount(async () => {
    user = await me()
    await loadAppData()
  })

  async function handleLoginSuccess(event) {
    user = event.detail
    await loadAppData()
  }

  async function handlePasswordChanged(event) {
    user = event.detail
    await loadAppData()
  }

  async function handleLogout() {
    await logout()
    user = null
    appData = null
  }

  async function refreshAppData() {
    await loadAppData()
  }

  let activeDomain = 0
  let searchQuery = ''
  let expandedId = null
  let activeTab = 'papers'
  let sortBy = 'num'

  const baseTabs = ['papers', 'compare', 'domtbl', 'gaps', 'cite', 'stack', 'charts', 'rejected']
  // Tabs follow the RBAC permissions the server sends with the user (see server/permissions.js).
  $: tabs = [
    ...baseTabs,
    ...(can(user, 'corpus:write') ? ['manage'] : []),
    ...(can(user, 'users:read') ? ['users'] : []),
    ...(can(user, 'audit:read') ? ['audit'] : []),
  ].map((id) => ({ id, label: $t(`tab.${id}`) }))

  $: filtered = papers
    .filter(p => activeDomain === 0 || p.domain === activeDomain)
    .filter(p => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q) ||
        p.venue.toLowerCase().includes(q) ||
        p.what.toLowerCase().includes(q) ||
        p.tags.some(t => t.label.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score
      if (sortBy === 'year') return b.year - a.year
      return a.id - b.id
    })

  function toggleCard(id) {
    expandedId = expandedId === id ? null : id
  }

  $: totalPapers = papers.length
  $: totalTarget = domains.reduce((s, d) => s + d.target, 0)
  $: overallPct = totalTarget ? Math.round((totalPapers / totalTarget) * 100) : 0
  $: rejectedOutright = rejected.filter(p => p.status === 'rejected').length
  $: removedAfterInclusion = rejected.filter(p => p.status === 'removed').length
  $: totalReviewed = totalPapers + rejected.length
</script>

{#if user === undefined}
  <div class="auth-loading">{$t('common.loading')}</div>
{:else if user === null}
  <Login on:success={handleLoginSuccess} />
{:else if user.mustChangePassword}
  <ForcePasswordChange {user} on:changed={handlePasswordChanged} on:logout={handleLogout} />
{:else if !appData}
  <div class="auth-loading">{$t('app.loadingData')}</div>
{:else}
<div class="layout">
  <!-- ── Sidebar ── -->
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-icon">{config.icon}</div>
      <div class="logo-text">
        <div class="logo-title">{config.title}</div>
        {#if config.subtitle}<div class="logo-sub">{config.subtitle}</div>{/if}
      </div>
    </div>

    <div class="overall-progress">
      <div class="prog-label">{$t('side.overall')}</div>
      <div class="prog-bar">
        <div class="prog-fill" style="width:{overallPct}%"></div>
      </div>
      <div class="prog-count">{$t('side.count', { n: totalPapers, target: totalTarget, pct: overallPct })}</div>
      <button class="prog-breakdown" on:click={() => activeTab = 'rejected'} title={$t('side.seeRejected')}>
        {$t('side.breakdown', { read: totalReviewed, inc: totalPapers, rej: rejectedOutright, rem: removedAfterInclusion })}
      </button>
    </div>

    <nav class="domain-nav">
      <button class="domain-btn all" class:active={activeDomain === 0} on:click={() => { activeDomain = 0; activeTab = 'papers' }}>
        <span class="dn-dot" style="background:var(--accent)"></span>
        <span class="dn-name">{$t('side.allDomains')}</span>
        <span class="dn-count">{totalPapers}</span>
      </button>
      {#each domains as domain}
        <button class="domain-btn" class:active={activeDomain === domain.id}
          on:click={() => { activeDomain = domain.id; activeTab = 'papers' }}>
          <span class="dn-dot" style="background:{domain.color}"></span>
          <span class="dn-name">D{domain.id} {domain.label}</span>
          <span class="dn-count" style="color:{domain.color}">{domain.papers.length}</span>
        </button>
      {/each}
    </nav>

    <!-- Views nav -->
    <div class="sidebar-views">
      <div class="sv-label">{$t('side.views')}</div>
      {#each tabs as tab}
        <button class="sv-btn" class:active={activeTab === tab.id} on:click={() => activeTab = tab.id}>
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="sidebar-bottom">
      <button class="account-btn" on:click={() => (showAccount = true)}>
        <span class="account-email">{user.email}</span>
        <span class="role-chip" class:admin={user.role === 'admin'}>{$t(`role.${user.role}`)}</span>
      </button>
      <div class="sidebar-bottom-row">
        <button class="theme-toggle" on:click={toggleTheme} title={$t('side.theme')} aria-label={$t('side.theme')}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <LangToggle />
        <button class="logout-btn" on:click={handleLogout}>{$t('side.signOut')}</button>
      </div>
      <div class="footer-line">{$t('side.updated', { date: $fmtDate(buildDate) })}</div>
      <div class="footer-line">{$t('side.stats', { d: domains.length, g: appData.gaps.length, c: Object.keys(appData.citations).length })}</div>
    </div>
  </aside>

  <!-- ── Main ── -->
  <main class="main">
    <!-- top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="page-title">
          {#if activeTab === 'papers'}
            {#if activeDomain === 0}
              {$t('title.allPapers')} <span class="count-badge">{filtered.length}</span>
            {:else}
              {#each domains.filter(d => d.id === activeDomain) as domain}
                <span style="color:{domain.color}">D{domain.id}</span>
                {domain.label}
                <span class="count-badge" style="background:{domain.color}15;color:{domain.color};border-color:{domain.color}30">{filtered.length}</span>
              {/each}
            {/if}
          {:else if activeTab === 'compare'}
            {$t('title.compare')}
          {:else if activeTab === 'domtbl'}
            {$t('title.domtbl')}
          {:else if activeTab === 'gaps'}
            {$t('title.gaps')}
          {:else if activeTab === 'cite'}
            {$t('title.cite')}
          {:else if activeTab === 'stack'}
            {config.pipelineTitle}
          {:else if activeTab === 'charts'}
            {$t('title.charts')}
          {:else if activeTab === 'manage'}
            {$t('tab.manage')}
          {:else if activeTab === 'users'}
            {$t('tab.users')}
          {:else if activeTab === 'audit'}
            {$t('tab.audit')}
          {:else if activeTab === 'rejected'}
            {$t('tab.rejected')} <span class="count-badge">{rejected.length}</span>
          {/if}
        </h1>
      </div>
    </header>

    <!-- papers controls -->
    {#if activeTab === 'papers'}
      <div class="controls">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            class="search-input"
            type="text"
            placeholder={$t('papers.search')}
            bind:value={searchQuery}
          />
          {#if searchQuery}
            <button class="clear-btn" on:click={() => searchQuery = ''}>✕</button>
          {/if}
        </div>

        <div class="sort-wrap">
          <label class="sort-label" for="sort">{$t('papers.sort')}</label>
          <select id="sort" class="sort-select" bind:value={sortBy}>
            <option value="num">{$t('papers.sortNum')}</option>
            <option value="score">{$t('col.relevance')}</option>
            <option value="year">{$t('col.year')}</option>
          </select>
        </div>

        <button class="expand-all" on:click={() => expandedId = expandedId ? null : '__all'}>
          {expandedId ? $t('papers.collapseAll') : $t('papers.expandAll')}
        </button>
      </div>
    {/if}

    <!-- content -->
    <div class="content">
      {#if activeTab === 'papers'}
        {#if filtered.length === 0}
          <div class="empty">{$t('papers.noMatch', { q: searchQuery })}</div>
        {:else}
          <div class="papers-list">
            {#each filtered as paper (paper.id)}
              <PaperCard
                {paper}
                {domains}
                expanded={expandedId === paper.id || expandedId === '__all'}
                on:click={() => toggleCard(paper.id)}
              />
            {/each}
          </div>
        {/if}

      {:else if activeTab === 'compare'}
        <DomainComparisonTables {papers} {domains} dimensions={appData.dimensions} cells={appData.dimensionCells} />

      {:else if activeTab === 'domtbl'}
        <DomainTables {papers} {domains} />

      {:else if activeTab === 'gaps'}
        <GapAnalysis gaps={appData.gaps} />

      {:else if activeTab === 'cite'}
        <CitationsView {papers} {domains} citations={appData.citations} />

      {:else if activeTab === 'stack'}
        <CoverageStack {domains} stackLayers={appData.stackLayers} title={config.pipelineTitle} subtitle={config.pipelineSubtitle} />

      {:else if activeTab === 'charts'}
        <ChartsView {papers} {domains} />

      {:else if activeTab === 'rejected'}
        <RejectedPapersView {rejected} totalIncluded={totalPapers} />

      {:else if activeTab === 'manage'}
        <ManageData {appData} refresh={refreshAppData} />

      {:else if activeTab === 'users'}
        <UsersView {user} canWrite={can(user, 'users:write')} />

      {:else if activeTab === 'audit'}
        <AuditLogView />
      {/if}
    </div>
  </main>
</div>

{#if showAccount}
  <AccountPanel {user} on:close={() => (showAccount = false)} on:updated={(e) => (user = e.detail)} />
{/if}
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    min-height: 100vh;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 14px;
    border-bottom: 1px solid var(--border);
  }
  .logo-icon { font-size: 1.6rem; }
  .logo-title { font-size: 0.88rem; font-weight: 700; color: var(--text); line-height: 1.2; }
  .logo-sub { font-size: 0.68rem; color: var(--text3); }

  .overall-progress {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 5px;
  }
  .prog-label { font-size: 0.67rem; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; }
  .prog-bar { height: 6px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .prog-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: 99px; transition: width 0.8s ease; }
  .prog-count { font-size: 0.72rem; color: var(--accent); font-weight: 600; }
  .prog-breakdown {
    font-size: 0.65rem; color: var(--text3); background: none; border: none;
    padding: 0; margin-top: 2px; text-align: left; cursor: pointer; line-height: 1.4;
    transition: color var(--transition);
  }
  .prog-breakdown:hover { color: var(--accent); text-decoration: underline; }

  .domain-nav { padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }

  .domain-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: var(--radius);
    border: none; background: none; color: var(--text2);
    font-size: 0.79rem; cursor: pointer; text-align: left;
    transition: all var(--transition); width: 100%;
  }
  .domain-btn:hover { background: var(--surface2); color: var(--text); }
  .domain-btn.active { background: var(--accent-glow); color: var(--text); }
  .dn-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .dn-name { flex: 1; line-height: 1.3; font-weight: 500; }
  .dn-count { font-size: 0.72rem; font-weight: 700; color: var(--text3); min-width: 20px; text-align: right; }
  .domain-btn.active .dn-count { color: var(--accent); }

  .sidebar-views {
    padding: 10px 8px 8px;
    border-top: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 2px;
  }
  .sv-label { font-size: 0.65rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.07em; padding: 4px 10px 2px; }
  .sv-btn {
    padding: 6px 10px; border-radius: var(--radius);
    border: none; background: none; color: var(--text3);
    font-size: 0.79rem; cursor: pointer; text-align: left;
    transition: all var(--transition); width: 100%;
  }
  .sv-btn:hover { background: var(--surface2); color: var(--text2); }
  .sv-btn.active { background: var(--surface2); color: var(--accent2); font-weight: 600; }

  .sidebar-bottom {
    margin-top: auto;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 8px;
  }
  /* wraps when "Sign out" is too long for one row (the Thai label is) */
  .sidebar-bottom-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .footer-line { font-size: 0.67rem; color: var(--text3); line-height: 1.6; }

  /* ── Main ── */
  .main { display: flex; flex-direction: column; min-height: 100vh; min-width: 0; }

  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 24px; border-bottom: 1px solid var(--border);
    background: var(--surface); gap: 16px; flex-wrap: wrap;
    position: sticky; top: 0; z-index: 10;
  }
  .topbar-left { flex: 1; min-width: 0; }
  .page-title {
    font-size: 1.1rem; font-weight: 700; color: var(--text);
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .count-badge {
    font-size: 0.7rem; font-weight: 700; padding: 2px 8px;
    border-radius: 99px; background: var(--accent-glow);
    color: var(--accent); border: 1px solid rgba(108,143,255,0.3);
  }

  .auth-loading {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    color: var(--text3); font-size: 0.85rem;
  }

  .theme-toggle {
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; width: 32px; height: 32px; padding: 0;
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 0.95rem; line-height: 1; cursor: pointer;
    transition: all var(--transition);
  }
  .theme-toggle:hover { border-color: var(--accent); }

  .account-btn {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    width: 100%; padding: 7px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text2); font-size: 0.76rem; cursor: pointer;
    transition: all var(--transition);
  }
  .account-btn:hover { border-color: var(--accent); color: var(--text); }
  .account-email { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .role-chip {
    font-size: 0.64rem; font-weight: 700; text-transform: uppercase;
    padding: 1px 7px; border-radius: 99px; letter-spacing: 0.04em;
    background: var(--surface3); color: var(--text3); flex-shrink: 0;
  }
  .role-chip.admin { background: var(--accent-glow); color: var(--accent); }
  .logout-btn {
    flex: 1; padding: 6px 12px; background: none;
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text3); font-size: 0.78rem; cursor: pointer;
    transition: all var(--transition); white-space: nowrap;
  }
  .logout-btn:hover { border-color: var(--danger); color: var(--danger); }

  .controls {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 24px; border-bottom: 1px solid var(--border); flex-wrap: wrap;
  }

  .search-wrap {
    flex: 1; min-width: 200px; max-width: 440px;
    position: relative; display: flex; align-items: center;
  }
  .search-icon { position: absolute; left: 10px; font-size: 0.85rem; pointer-events: none; }
  .search-input {
    width: 100%; padding: 7px 10px 7px 32px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text); font-size: 0.85rem;
    outline: none; transition: border-color var(--transition);
  }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--text3); }
  .clear-btn {
    position: absolute; right: 8px;
    background: none; border: none; color: var(--text3);
    cursor: pointer; font-size: 0.8rem; padding: 2px 4px;
  }

  .sort-wrap { display: flex; align-items: center; gap: 6px; }
  .sort-label { font-size: 0.78rem; color: var(--text3); }
  .sort-select {
    padding: 6px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.8rem; outline: none; cursor: pointer;
  }

  .expand-all {
    padding: 6px 14px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text2); font-size: 0.78rem; cursor: pointer;
    transition: all var(--transition); white-space: nowrap;
  }
  .expand-all:hover { border-color: var(--accent); color: var(--accent); }

  .content { padding: 20px 24px; flex: 1; min-width: 0; }
  .papers-list { display: flex; flex-direction: column; gap: 8px; }
  .empty {
    text-align: center; color: var(--text3); font-size: 0.9rem;
    padding: 48px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius2);
  }

  @media (max-width: 768px) {
    .layout { grid-template-columns: 1fr; }
    .sidebar { position: relative; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
  }
</style>
