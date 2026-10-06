import { generateSecret, generateURI, verify, createGuardrails } from 'otplib'
import QRCode from 'qrcode'
import { config } from './config.js'

// otplib 12 generated 10-byte secrets; new ones are 20 bytes. Accept the old length when verifying so
// accounts enrolled before the upgrade keep working (otplib otherwise rejects anything under 16 bytes).
const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 })

export const generateTotpSecret = () => generateSecret()

export async function buildQrCode(secret, email) {
  const otpauthUrl = generateURI({ issuer: config.twofaIssuer, label: email, secret })
  return { otpauthUrl, qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl) }
}

// Returns the 30-second time step the code belongs to, or null if the code is wrong.
// epochTolerance 30 s = the previous and next step too, for clock drift between phone and server.
// afterTimeStep rejects any code from a step at or before the last accepted one, so a code someone
// saw over your shoulder can't be used a second time.
export async function matchTotpStep(secret, code, afterTimeStep = null) {
  const token = String(code || '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(token)) return null
  const result = await verify({
    secret,
    token,
    epochTolerance: 30,
    guardrails,
    ...(afterTimeStep !== null && afterTimeStep !== undefined && { afterTimeStep }),
  })
  return result.valid ? result.timeStep : null
}
