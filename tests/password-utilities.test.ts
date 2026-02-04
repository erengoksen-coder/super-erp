import { hashPassword, verifyPassword, isLegacySha256Hash } from '../lib/auth/password'

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', () => {
      const password = 'testPassword123'
      const hash = hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should generate different hashes for same password', () => {
      const password = 'testPassword123'
      const hash1 = hashPassword(password)
      const hash2 = hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('isLegacySha256Hash', () => {
    it('should identify SHA-256 hashes', () => {
      const sha256Hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      expect(isLegacySha256Hash(sha256Hash)).toBe(true)
    })

    it('should reject non-SHA-256 hashes', () => {
      const bcryptHash = hashPassword('password')
      expect(isLegacySha256Hash(bcryptHash)).toBe(false)
    })

    it('should reject invalid hashes', () => {
      expect(isLegacySha256Hash('invalid')).toBe(false)
      expect(isLegacySha256Hash('123')).toBe(false)
      expect(isLegacySha256Hash('')).toBe(false)
    })
  })

  describe('verifyPassword', () => {
    it('should verify bcrypt passwords', () => {
      const password = 'testPassword123'
      const hash = hashPassword(password)
      
      expect(verifyPassword(password, hash)).toBe(true)
    })

    it('should reject incorrect bcrypt passwords', () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const hash = hashPassword(password)
      
      expect(verifyPassword(wrongPassword, hash)).toBe(false)
    })

    it('should verify legacy SHA-256 passwords', () => {
      const password = 'testPassword123'
      const legacyHash = require('crypto').createHash('sha256').update(password).digest('hex')
      
      expect(verifyPassword(password, legacyHash)).toBe(true)
    })

    it('should reject incorrect legacy passwords', () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const legacyHash = require('crypto').createHash('sha256').update(password).digest('hex')
      
      expect(verifyPassword(wrongPassword, legacyHash)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(verifyPassword('', '')).toBe(false)
      expect(verifyPassword('password', '')).toBe(false)
      expect(verifyPassword('password', null as any)).toBe(false)
      expect(verifyPassword(null as any, 'hash')).toBe(false)
    })
  })
})