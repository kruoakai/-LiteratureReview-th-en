<script>
  import { onMount } from 'svelte'
  import { listAuditEvents } from '../auth.js'
  import { t, fmtDateTime } from '../i18n.js'

  let events = []
  let error = ''
  let loading = true
  let filter = ''

  // Known events have a translated label (audit.<event> in i18n.js); others show their raw name.
  $: label = (event) => {
    const key = `audit.${event}`
    const s = $t(key)
    return s === key ? event : s
  }
  const DANGER = new Set(['login_failed', 'login_locked', 'login_disabled', '2fa_setup_failed', '2fa_verify_failed'])

  async function refresh() {
    loading = true
    try {
      events = await listAuditEvents()
      error = ''
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  }
  onMount(refresh)

  const details = (m) => (m ? Object.entries(m).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`).join(' · ') : '')

  $: q = filter.trim().toLowerCase()
  $: shown = events.filter((e) => !q || `${JSON.stringify(e)} ${label(e.event)}`.toLowerCase().includes(q))
</script>

<section class="manage audit">
  <div class="bar">
    <input type="text" placeholder={$t('audit.filter')} bind:value={filter} />
    <button class="btn" on:click={refresh} disabled={loading}>{loading ? $t('common.loading') : $t('audit.refresh')}</button>
    <span class="muted">{$t('audit.note')}</span>
  </div>
  {#if error}<div class="msg error">{error}</div>{/if}
  <div class="table-wrap">
    <table>
      <thead><tr><th>{$t('audit.time')}</th><th>{$t('audit.event')}</th><th>{$t('audit.who')}</th><th>IP</th><th>{$t('audit.details')}</th></tr></thead>
      <tbody>
        {#each shown as e}
          <tr>
            <td class="muted nowrap">{$fmtDateTime(e.at)}</td>
            <td class:danger={DANGER.has(e.event)}>{label(e.event)}</td>
            <td>{e.actor ?? ''}</td>
            <td class="muted">{e.ip ?? ''}</td>
            <td class="muted">{details(e.metadata)}</td>
          </tr>
        {:else}
          <tr><td colspan="5" class="muted">{loading ? $t('common.loading') : $t('audit.none')}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .audit { display: flex; flex-direction: column; gap: 12px; max-width: 1100px; }
  .bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .bar input {
    flex: 1; min-width: 200px; max-width: 360px; padding: 6px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 0.82rem; outline: none;
  }
  .bar input:focus { border-color: var(--accent); }
  .muted { color: var(--text3); font-size: 0.74rem; }
  .nowrap { white-space: nowrap; }
  .danger { color: var(--danger); font-weight: 600; }
  .table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius2); }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th, td { padding: 7px 10px; border-bottom: 1px solid var(--border); text-align: left; }
  th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text3); background: var(--surface2); }
  tr:last-child td { border-bottom: none; }
</style>
