/**
 * Auth modülü – tek giriş noktası (Faz 4 Sprint 4.1).
 * Middleware API ve sayfa isteklerinde JWT doğrulaması yapar; hassas route'lar rol/izin kontrolü kullanır.
 */

export {
  createToken,
  verifyToken,
  getCurrentUser,
  signAccessToken,
  verifyAccessToken,
  accessTokenTtlSeconds,
  type AccessTokenPayload,
} from './jwt'

export { hashPassword, verifyPassword, isLegacySha256Hash } from './password'

export {
  isAdminRole,
  canAccessPath,
  getActionFromMethod,
  type Permission,
  type PermissionLike,
  type PermissionAction,
} from './permissions-check'
