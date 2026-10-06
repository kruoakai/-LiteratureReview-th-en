<script>
  import { lang, LANGS, t } from '../i18n.js'
</script>

<div class="lang-toggle" role="group" aria-label={$t('common.language')}>
  {#each LANGS as l}
    <button type="button" class="lang-btn" class:active={$lang === l.code} aria-pressed={$lang === l.code} on:click={() => lang.set(l.code)}>
      {l.label}
    </button>
  {/each}
</div>

<style>
  .lang-toggle {
    display: inline-flex; flex-shrink: 0; height: 32px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden;
  }
  .lang-btn {
    padding: 0 10px; background: none; border: none;
    color: var(--text3); font-size: 0.74rem; font-weight: 600; cursor: pointer;
    transition: all var(--transition);
  }
  .lang-btn + .lang-btn { border-left: 1px solid var(--border); }
  .lang-btn:hover { color: var(--text); }
  .lang-btn.active { background: var(--accent-glow); color: var(--accent); }
</style>
