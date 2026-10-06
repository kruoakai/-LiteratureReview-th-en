<script>
  import { createEventDispatcher } from 'svelte'
  import { changePassword } from '../auth.js'
  import { t } from '../i18n.js'

  // Shown after sign-in when an admin created the account or reset its password: the temporary
  // password has to be replaced before anything else. The server blocks every other API call until then.
  export let user

  const dispatch = createEventDispatcher()

  let currentPassword = ''
  let newPassword = ''
  let confirmPassword = ''
  let error = ''
  let saving = false

  async function submit() {
    error = ''
    if (newPassword !== confirmPassword) {
      error = $t('pw.mismatch')
      return
    }
    saving = true
    try {
      dispatch('changed', await changePassword(currentPassword, newPassword))
    } catch (e) {
      error = e.message
    } finally {
      saving = false
    }
  }
</script>

<div class="auth-screen">
  <form class="auth-card" on:submit|preventDefault={submit}>
    <h1 class="auth-heading">{$t('fpc.title')}</h1>
    <p class="auth-text">{$t('fpc.text1')} <strong>{user.email}</strong> {$t('fpc.text2')}</p>
    <label class="auth-field">
      <span>{$t('pw.temp')}</span>
      <input type="password" bind:value={currentPassword} autocomplete="current-password" required maxlength="128" />
    </label>
    <label class="auth-field">
      <span>{$t('pw.new')}</span>
      <input type="password" bind:value={newPassword} autocomplete="new-password" required minlength="8" maxlength="128" />
    </label>
    <label class="auth-field">
      <span>{$t('pw.confirm')}</span>
      <input type="password" bind:value={confirmPassword} autocomplete="new-password" required minlength="8" maxlength="128" />
    </label>
    {#if error}<div class="auth-error">{error}</div>{/if}
    <button class="auth-btn" type="submit" disabled={saving}>{saving ? $t('common.saving') : $t('fpc.save')}</button>
    <button type="button" class="auth-link" on:click={() => dispatch('logout')}>{$t('side.signOut')}</button>
  </form>
</div>
