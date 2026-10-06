<script>
  import { createEventDispatcher, onMount, tick } from 'svelte'
  import { login, startTwoFactorSetup, confirmTwoFactorSetup, verifyTwoFactor } from '../auth.js'
  import BackupCodes from './BackupCodes.svelte'
  import LangToggle from './LangToggle.svelte'
  import { t } from '../i18n.js'

  // Sign-in always has two factors: step 'password', then 'setup' (first time, or after an admin
  // reset) or 'verify'. After setup the new backup codes are shown once ('backup').
  const dispatch = createEventDispatcher()

  let step = 'password'
  let email = ''
  let password = ''
  let code = ''
  let error = ''
  let loading = false
  let setup = null // { qrCodeDataUrl, secret }
  let backupCodes = []
  let signedInUser = null
  let useBackupCode = false
  let codeInput
  let config = { title: 'Literature Review', subtitle: '', icon: '📚' }

  onMount(async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) config = await res.json()
      document.title = config.title
    } catch {}
  })

  function restart(message = '') {
    step = 'password'
    password = ''
    code = ''
    setup = null
    useBackupCode = false
    error = message
  }

  async function run(fn) {
    error = ''
    loading = true
    try {
      await fn()
    } catch (e) {
      // 401 here means the 5-minute sign-in step expired: go back to the password.
      if (e.status === 401 && step !== 'password') restart(e.message)
      else error = e.message
    } finally {
      loading = false
    }
  }

  const submitPassword = () => run(async () => {
    const { stage } = await login(email, password)
    password = ''
    if (stage === 'setup_required') {
      step = 'setup'
      setup = await startTwoFactorSetup()
    } else {
      step = 'verify'
    }
    await tick()
    codeInput?.focus()
  })

  const submitSetup = () => run(async () => {
    const result = await confirmTwoFactorSetup(code.trim())
    backupCodes = result.backupCodes
    signedInUser = result.user
    step = 'backup'
  })

  const submitVerify = () => run(async () => {
    const result = await verifyTwoFactor(code.trim())
    dispatch('success', result.user)
  })
</script>

<div class="auth-screen">
  <div class="auth-card" class:wide={step === 'setup' || step === 'backup'}>
    <div class="auth-logo">
      <div class="logo-icon">{config.icon}</div>
      <div class="auth-logo-text">
        <div class="logo-title">{config.title}</div>
        {#if config.subtitle}<div class="logo-sub">{config.subtitle}</div>{/if}
      </div>
      <LangToggle />
    </div>

    {#if step === 'password'}
      <form class="stack" on:submit|preventDefault={submitPassword}>
        <h1 class="auth-heading">{$t('login.signIn')}</h1>
        <label class="auth-field">
          <span>{$t('login.email')}</span>
          <input type="email" bind:value={email} autocomplete="username" required />
        </label>
        <label class="auth-field">
          <span>{$t('login.password')}</span>
          <input type="password" bind:value={password} autocomplete="current-password" required maxlength="128" />
        </label>
        {#if error}<div class="auth-error">{error}</div>{/if}
        <button class="auth-btn" type="submit" disabled={loading}>{loading ? $t('login.signingIn') : $t('login.continue')}</button>
      </form>

    {:else if step === 'setup'}
      <form class="stack" on:submit|preventDefault={submitSetup}>
        <h1 class="auth-heading">{$t('login.setupTitle')}</h1>
        <p class="auth-text">{$t('login.setupText')}</p>
        {#if setup}
          <img class="qr" src={setup.qrCodeDataUrl} alt={$t('login.qrAlt')} width="200" height="200" />
          <p class="auth-text center">{$t('login.cantScan')}</p>
          <div class="secret-box">{setup.secret}</div>
        {:else}
          <p class="auth-text">{$t('login.generating')}</p>
        {/if}
        <label class="auth-field">
          <span>{$t('login.code6')}</span>
          <input class="code" bind:this={codeInput} bind:value={code} inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
        </label>
        {#if error}<div class="auth-error">{error}</div>{/if}
        <button class="auth-btn" type="submit" disabled={loading || !setup}>{loading ? $t('login.checking') : $t('login.turnOn')}</button>
        <button type="button" class="auth-link" on:click={() => restart()}>{$t('common.cancel')}</button>
      </form>

    {:else if step === 'verify'}
      <form class="stack" on:submit|preventDefault={submitVerify}>
        <h1 class="auth-heading">{$t('login.verifyTitle')}</h1>
        {#if useBackupCode}
          <p class="auth-text">{$t('login.backupText')}</p>
          <label class="auth-field">
            <span>{$t('login.backupCode')}</span>
            <input class="code" bind:this={codeInput} bind:value={code} autocomplete="off" maxlength="9" placeholder="XXXX-XXXX" required />
          </label>
        {:else}
          <p class="auth-text">{$t('login.verifyText')}</p>
          <label class="auth-field">
            <span>{$t('login.code6')}</span>
            <input class="code" bind:this={codeInput} bind:value={code} inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
          </label>
        {/if}
        {#if error}<div class="auth-error">{error}</div>{/if}
        <button class="auth-btn" type="submit" disabled={loading}>{loading ? $t('login.checking') : $t('login.verify')}</button>
        <button type="button" class="auth-link" on:click={() => { useBackupCode = !useBackupCode; code = ''; error = '' }}>
          {useBackupCode ? $t('login.useApp') : $t('login.lostPhone')}
        </button>
        <button type="button" class="auth-link" on:click={() => restart()}>{$t('login.back')}</button>
      </form>

    {:else if step === 'backup'}
      <div class="stack">
        <h1 class="auth-heading">{$t('login.saveTitle')}</h1>
        <p class="auth-text">{$t('login.saveText1')} <strong>{$t('login.saveStrong')}</strong>{$t('login.saveText2')}</p>
        <BackupCodes codes={backupCodes} />
        <button class="auth-btn" on:click={() => dispatch('success', signedInUser)}>{$t('login.saved')}</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .stack { display: flex; flex-direction: column; gap: 14px; }
  .qr { align-self: center; border-radius: var(--radius); background: #fff; padding: 6px; }
  .center { text-align: center; }
</style>
