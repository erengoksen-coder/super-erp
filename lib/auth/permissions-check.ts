export type Permission = {
  page_path: string
  can_view: number
  can_create: number
  can_edit: number
  can_delete: number
}

/** İzin kontrolünde kullanılabilir (can_create/edit/delete opsiyonel). */
export type PermissionLike = Pick<Permission, 'page_path' | 'can_view'> & Partial<Pick<Permission, 'can_create' | 'can_edit' | 'can_delete'>>

/** Admin/yönetici rolü tüm menü ve API erişimine sahip; izin kontrolü atlanır. */
export function isAdminRole(role: string | undefined | null): boolean {
  const r = (role ?? '').toString().trim().toLowerCase()
  return r === 'admin' || r === 'yönetici' || r === 'yonetici' || r === 'manager' || r === 'planlama'
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

export function getActionFromMethod(method: string): PermissionAction {
  const normalized = method.toUpperCase()
  if (normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS') return 'view'
  if (normalized === 'POST') return 'create'
  if (normalized === 'PUT' || normalized === 'PATCH') return 'edit'
  if (normalized === 'DELETE') return 'delete'
  return 'view'
}

export function canAccessPath(
  permissions: PermissionLike[],
  pathname: string,
  action: PermissionAction
) {
  if (!permissions.length) return false

  const matched = permissions
    .filter((perm) => {
      if (perm.page_path === '/') {
        return pathname === '/'
      }
      return pathname === perm.page_path || pathname.startsWith(`${perm.page_path}/`)
    })
    .sort((a, b) => b.page_path.length - a.page_path.length)[0]

  if (!matched) return false

  switch (action) {
    case 'create':
      return (matched.can_create ?? 0) > 0
    case 'edit':
      return (matched.can_edit ?? 0) > 0
    case 'delete':
      return (matched.can_delete ?? 0) > 0
    default:
      return (matched.can_view ?? 0) > 0
  }
}
