import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

const BCRYPT_ROUNDS = 10
/** bcrypt maksimum giriş uzunluğu (OWASP Password Storage Cheat Sheet). */
const BCRYPT_MAX_BYTES = 72

function sha256(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export function isLegacySha256Hash(value: string) {
  return /^[a-f0-9]{64}$/i.test(value)
}

export function hashPassword(password: string) {
  if (typeof password !== 'string') throw new Error('Parola metin olmalı')
  const len = Buffer.byteLength(password, 'utf8')
  if (len > BCRYPT_MAX_BYTES) throw new Error(`Parola en fazla ${BCRYPT_MAX_BYTES} bayt olabilir (bcrypt sınırı)`)
  return bcrypt.hashSync(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password: string, hash: string) {
  if (typeof password !== 'string' || typeof hash !== 'string') {
    return false
  }
  if (!password || !hash) {
    return false
  }
  if (isLegacySha256Hash(hash)) {
    return sha256(password) === hash
  }
  return bcrypt.compareSync(password, hash)
}
