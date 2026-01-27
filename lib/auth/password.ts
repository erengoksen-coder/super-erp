import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

const BCRYPT_ROUNDS = 10

function sha256(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export function isLegacySha256Hash(value: string) {
  return /^[a-f0-9]{64}$/i.test(value)
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password: string, hash: string) {
  if (isLegacySha256Hash(hash)) {
    return sha256(password) === hash
  }
  return bcrypt.compareSync(password, hash)
}
