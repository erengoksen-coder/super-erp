import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('password hashing', () => {
  it('hashes and verifies passwords', () => {
    const hash = hashPassword('secret-123')
    expect(verifyPassword('secret-123', hash)).toBe(true)
    expect(verifyPassword('wrong', hash)).toBe(false)
  })
})
