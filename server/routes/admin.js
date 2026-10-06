import { Router } from 'express'
import { requireAuth, requirePermission } from '../middleware.js'
import { recordEvent, listEvents } from '../audit.js'
import { listUsers, createUser, updateRoleStatus, setPassword, resetTwoFactor, deleteUser, findById, publicUser } from '../users.js'

const router = Router()
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Every admin route needs a full session (password + 2FA) first, then a permission from permissions.js.
router.use(requireAuth())

router.get('/users', requirePermission('users:read'), (req, res) => {
  res.json(listUsers())
})

router.post('/users', requirePermission('users:write'), wrap(async (req, res) => {
  const { email, role, temporaryPassword } = req.body || {}
  const user = await createUser({ email, password: temporaryPassword, role })
  recordEvent(req, 'admin_user_created', { target: user.email, role })
  res.status(201).json(publicUser(user))
}))

router.patch('/users/:id', requirePermission('users:write'), (req, res) => {
  const { role, status } = req.body || {}
  const user = updateRoleStatus(req.user.id, req.params.id, { role, status })
  recordEvent(req, 'admin_user_updated', { target: user.email, role, status })
  res.json(publicUser(user))
})

router.post('/users/:id/reset-password', requirePermission('users:write'), wrap(async (req, res) => {
  const target = findById(req.params.id)
  if (!target) return res.status(404).json({ error: 'User not found' })
  // The user gets a temporary password, is signed out everywhere, and must pick a new one at next sign-in.
  const user = await setPassword(target.id, req.body?.temporaryPassword, { mustChangePassword: true })
  recordEvent(req, 'admin_password_reset', { target: user.email })
  res.json(publicUser(user))
}))

router.post('/users/:id/reset-2fa', requirePermission('users:write'), (req, res) => {
  const user = resetTwoFactor(req.params.id)
  recordEvent(req, 'admin_2fa_reset', { target: user.email })
  res.json(publicUser(user))
})

router.delete('/users/:id', requirePermission('users:write'), (req, res) => {
  const user = deleteUser(req.user.id, req.params.id)
  recordEvent(req, 'admin_user_deleted', { target: user.email })
  res.json({ ok: true })
})

router.get('/audit-logs', requirePermission('audit:read'), (req, res) => {
  res.json(listEvents(300))
})

export default router
