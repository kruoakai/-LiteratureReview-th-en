export const ROLES = ['admin', 'manager', 'user']

// Central RBAC map: permission -> roles allowed to use it. Adding a permission or role only touches
// this file and the route that guards itself with requirePermission(). The client receives the
// resolved list from /api/auth/me and hides what the user cannot do; the server still enforces it.
export const PERMISSIONS = {
  'corpus:read': ['admin', 'manager', 'user'], // every view, PDF downloads
  'corpus:write': ['admin', 'manager'], // the Manage Data tab
  'users:read': ['admin', 'manager'], // see the user list
  'users:write': ['admin'], // create / change role / disable / reset / delete users
  'audit:read': ['admin'], // security audit log
}

export function roleHasPermission(role, permission) {
  return (PERMISSIONS[permission] || []).includes(role)
}

export function permissionsFor(role) {
  return Object.keys(PERMISSIONS).filter((p) => roleHasPermission(role, p))
}
