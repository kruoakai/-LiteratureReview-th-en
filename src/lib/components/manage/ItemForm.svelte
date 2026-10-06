<script>
  import { createEventDispatcher } from 'svelte'
  import { t } from '../../i18n.js'

  export let fields = []
  export let draft
  export let texts = {}
  export let saving = false
  export let error = ''
  export let submitLabel = ''
  export let cancellable = true

  const dispatch = createEventDispatcher()

  $: TAG_TYPES = [
    { value: 'yes', label: $t('if.positive') },
    { value: 'warn', label: $t('if.warning') },
    { value: '', label: $t('if.neutral') },
  ]

  // Replace the whole object rather than assigning draft[key]: in Svelte 5's legacy mode a member
  // assignment here compiles to an invalidation of the template's {#each} variable and throws.
  function addTag(key) {
    draft = { ...draft, [key]: [...draft[key], { label: '', type: 'yes' }] }
  }
  function removeTag(key, i) {
    draft = { ...draft, [key]: draft[key].filter((_, j) => j !== i) }
  }
</script>

<form class="if-form" on:submit|preventDefault={() => dispatch('submit')}>
  <div class="if-grid">
    {#each fields as f (f.key)}
      <div class="field" class:wide={f.wide || ['textarea', 'lines', 'tags'].includes(f.type)}>
        {#if f.type === 'checkbox'}
          <label class="checkbox-field">
            <input type="checkbox" bind:checked={draft[f.key]} />
            <span>{f.label}</span>
          </label>
        {:else}
          <label class="field-label" for="if-{f.key}">{f.label}{f.required ? ' *' : ''}</label>
          {#if f.type === 'textarea'}
            <textarea id="if-{f.key}" rows={f.rows || 3} bind:value={draft[f.key]} placeholder={f.placeholder || ''}></textarea>
          {:else if f.type === 'number'}
            <input id="if-{f.key}" type="number" min={f.min} max={f.max} bind:value={draft[f.key]} required={f.required} />
          {:else if f.type === 'select'}
            <select id="if-{f.key}" bind:value={draft[f.key]}>
              {#each f.options as o}
                <option value={o.value}>{o.label}</option>
              {/each}
            </select>
          {:else if f.type === 'color'}
            <div class="color-row">
              <input type="color" bind:value={draft[f.key]} aria-label={f.label} />
              <input id="if-{f.key}" type="text" bind:value={draft[f.key]} />
            </div>
          {:else if f.type === 'lines'}
            <textarea id="if-{f.key}" rows={f.rows || 3} bind:value={texts[f.key]} placeholder={f.placeholder || $t('if.onePerLine')}></textarea>
          {:else if f.type === 'numbers'}
            <input id="if-{f.key}" type="text" bind:value={texts[f.key]} placeholder={f.placeholder || $t('if.numbersPh')} />
          {:else if f.type === 'tags'}
            <div class="tags">
              {#each draft[f.key] as tag, i}
                <div class="tag-row">
                  <input type="text" bind:value={tag.label} placeholder={$t('if.tagLabel')} aria-label={$t('if.tagLabel')} />
                  <select bind:value={tag.type} aria-label={$t('if.tagType')}>
                    {#each TAG_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
                  </select>
                  <button type="button" class="btn ghost-danger" on:click={() => removeTag(f.key, i)}>✕</button>
                </div>
              {/each}
              <button type="button" class="btn" on:click={() => addTag(f.key)}>{$t('if.addTag')}</button>
            </div>
          {:else}
            <input id="if-{f.key}" type="text" bind:value={draft[f.key]} placeholder={f.placeholder || ''} required={f.required} />
          {/if}
        {/if}
        {#if f.hint}<div class="hint">{f.hint}</div>{/if}
      </div>
    {/each}
  </div>

  {#if error}<div class="msg error">{error}</div>{/if}

  <div class="if-actions">
    <button class="btn primary" type="submit" disabled={saving}>{saving ? $t('common.saving') : submitLabel || $t('common.save')}</button>
    {#if cancellable}<button class="btn" type="button" on:click={() => dispatch('cancel')}>{$t('common.cancel')}</button>{/if}
  </div>
</form>

<style>
  .if-form {
    display: flex; flex-direction: column; gap: 14px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 16px;
  }
  .if-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .field.wide { grid-column: 1 / -1; }
  .field-label { font-size: 0.78rem; color: var(--text2); font-weight: 500; }
  .hint { font-size: 0.7rem; color: var(--text3); line-height: 1.4; }

  input[type='text'], input[type='number'], select, textarea {
    width: 100%; padding: 7px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 0.84rem; outline: none;
    font-family: inherit; resize: vertical;
    transition: border-color var(--transition);
  }
  input:focus, select:focus, textarea:focus { border-color: var(--accent); }

  .color-row { display: flex; gap: 8px; align-items: center; }
  input[type='color'] {
    width: 38px; height: 34px; padding: 2px; flex-shrink: 0;
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer;
  }

  .checkbox-field { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text2); cursor: pointer; padding-top: 20px; }

  .tags { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
  .tag-row { display: flex; gap: 6px; width: 100%; max-width: 520px; }
  .tag-row select { width: 130px; flex-shrink: 0; }

  .if-actions { display: flex; gap: 8px; }
</style>
