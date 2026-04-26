export * from './workflow'

export interface UserPermission {
  id: string
  userId: string
  page_path: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface User {
  id: string
  username: string
  email?: string
  full_name?: string
  role: string
  is_approved: boolean
  is_locked: boolean
  created_at: string
}

export interface AuthMeResponse {
  user?: User
  data?: {
    user: User
  }
}
