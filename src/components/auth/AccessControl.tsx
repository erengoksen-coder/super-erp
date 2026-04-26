'use client'

import React from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { canAccessPath, isAdminRole, type PermissionAction } from '@/lib/auth/permissions-check'

interface AccessControlProps {
  /** The children to render if authorized */
  children: React.ReactNode
  /** Optional fallback to render if not authorized */
  fallback?: React.ReactNode
  /** Specific path to check (defaults to current if not provided in granular cases) */
  path?: string
  /** The action to check: 'view' | 'create' | 'edit' | 'delete' */
  action?: PermissionAction
  /** Explicit roles allowed (e.g. ['admin', 'manager']) */
  roles?: string[]
}

/**
 * Platinum Access Control Component
 * Robustly manages visibility of UI elements based on user roles and permissions.
 */
export function AccessControl({
  children,
  fallback = null,
  path,
  action = 'view',
  roles,
}: AccessControlProps) {
  const user = useAuthStore((state) => state.user)

  if (!user) return <>{fallback}</>

  // 1. Admin / Manager (as defined in isAdminRole) always has access
  if (isAdminRole(user.role)) return <>{children}</>

  // 2. Explicit role check if provided
  if (roles && roles.length > 0) {
    const userRole = (user.role || '').toLowerCase().trim()
    const isAllowed = roles.some(r => r.toLowerCase().trim() === userRole)
    if (isAllowed) return <>{children}</>
    if (!path) return <>{fallback}</> // If explicit roles are set and failed, hide unless path is also provided
  }

  // 3. Permission-based check via canAccessPath
  if (path) {
    const hasPermission = canAccessPath(user.permissions || [], path, action)
    if (hasPermission) return <>{children}</>
    return <>{fallback}</>
  }

  // Default to hiding if no specific rules match and not an admin
  return <>{fallback}</>
}
