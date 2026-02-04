import { hashPassword, verifyPassword, isLegacySha256Hash } from '../../lib/auth/password'

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash a password', () => {
      const password = 'TestPassword123'
      const hash = hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should generate different hashes for same password', () => {
      const password = 'TestPassword123'
      const hash1 = hashPassword(password)
      const hash2 = hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct bcrypt password', () => {
      const password = 'TestPassword123'
      const hash = hashPassword(password)
      
      const isValid = verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect bcrypt password', () => {
      const password = 'TestPassword123'
      const wrongPassword = 'WrongPassword123'
      const hash = hashPassword(password)
      
      const isValid = verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('should verify legacy SHA-256 password', () => {
      const password = 'TestPassword123'
      const legacyHash = require('crypto').createHash('sha256').update(password).digest('hex')
      
      const isValid = verifyPassword(password, legacyHash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect legacy password', () => {
      const password = 'TestPassword123'
      const wrongPassword = 'WrongPassword123'
      const legacyHash = require('crypto').createHash('sha256').update(wrongPassword).digest('hex')
      
      const isValid = verifyPassword(password, legacyHash)
      expect(isValid).toBe(false)
    })
  })

  describe('isLegacySha256Hash', () => {
    it('should identify SHA-256 hash', () => {
      const sha256Hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      expect(isLegacySha256Hash(sha256Hash)).toBe(true)
    })

    it('should reject bcrypt hash', () => {
      const bcryptHash = hashPassword('test')
      expect(isLegacySha256Hash(bcryptHash)).toBe(false)
    })

    it('should reject invalid hash', () => {
      const invalidHash = 'invalid-hash'
      expect(isLegacySha256Hash(invalidHash)).toBe(false)
    })
  })

  describe('Password Migration', () => {
    it('should allow upgrading from legacy to bcrypt', () => {
      const password = 'TestPassword123'
      const legacyHash = require('crypto').createHash('sha256').update(password).digest('hex')
      
      // Verify legacy hash works
      expect(verifyPassword(password, legacyHash)).toBe(true)
      expect(isLegacySha256Hash(legacyHash)).toBe(true)
      
      // Create new bcrypt hash
      const newHash = hashPassword(password)
      
      // Verify new hash works
      expect(verifyPassword(password, newHash)).toBe(true)
      expect(isLegacySha256Hash(newHash)).toBe(false)
    })
  })
})
