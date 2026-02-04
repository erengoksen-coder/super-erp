import { validateRequest, userSchemas, materialSchemas } from '../../lib/validation/schemas'

describe('Validation Schemas', () => {
  describe('User Schemas', () => {
    describe('create', () => {
      it('should validate correct user data', () => {
        const userData = {
          username: 'testuser',
          password: 'TestPass123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'user',
          job_title: 'Test Developer',
        }

        const result = validateRequest(userSchemas.create, userData)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.username).toBe('testuser')
          expect(result.data.email).toBe('test@example.com')
        }
      })

      it('should reject invalid username', () => {
        const userData = {
          username: 'ab', // Too short
          password: 'TestPass123',
          full_name: 'Test User',
          role: 'user',
          job_title: 'Test Developer',
        }

        const result = validateRequest(userSchemas.create, userData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('Kullanıcı adı en az 3 karakter')
        }
      })

      it('should reject weak password', () => {
        const userData = {
          username: 'testuser',
          password: 'weak', // Doesn't meet requirements
          full_name: 'Test User',
          role: 'user',
          job_title: 'Test Developer',
        }

        const result = validateRequest(userSchemas.create, userData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('Şifre en az 8 karakter')
        }
      })

      it('should reject invalid email', () => {
        const userData = {
          username: 'testuser',
          password: 'TestPass123',
          email: 'invalid-email',
          full_name: 'Test User',
          role: 'user',
          job_title: 'Test Developer',
        }

        const result = validateRequest(userSchemas.create, userData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('Geçersiz e-posta formatı')
        }
      })
    })

    describe('login', () => {
      it('should validate login credentials', () => {
        const loginData = {
          username: 'testuser',
          password: 'anypassword',
        }

        const result = validateRequest(userSchemas.login, loginData)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.username).toBe('testuser')
          expect(result.data.password).toBe('anypassword')
        }
      })

      it('should reject empty username', () => {
        const loginData = {
          username: '',
          password: 'password',
        }

        const result = validateRequest(userSchemas.login, loginData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('Kullanıcı adı gerekli')
        }
      })
    })
  })

  describe('Material Schemas', () => {
    describe('create', () => {
      it('should validate correct material data', () => {
        const materialData = {
          code: 'MAT001',
          name: 'Test Material',
          description: 'Test material description',
          category: 'Test Category',
          unit: 'kg',
          unit_cost: 100.50,
          min_stock: 10,
          max_stock: 100,
        }

        const result = validateRequest(materialSchemas.create, materialData)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.code).toBe('MAT001')
          expect(result.data.name).toBe('Test Material')
          expect(result.data.unit_cost).toBe(100.50)
        }
      })

      it('should reject negative unit cost', () => {
        const materialData = {
          code: 'MAT001',
          name: 'Test Material',
          category: 'Test Category',
          unit: 'kg',
          unit_cost: -10, // Negative
        }

        const result = validateRequest(materialSchemas.create, materialData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('Fiyat negatif olamaz')
        }
      })

      it('should reject missing required fields', () => {
        const materialData = {
          code: 'MAT001',
          // Missing name, category, unit
        }

        const result = validateRequest(materialSchemas.create, materialData)
        
        expect(result.success).toBe(false)
      })
    })
  })

  describe('validateRequest function', () => {
    it('should handle invalid JSON', () => {
      const result = validateRequest(userSchemas.login, null)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid input')
      }
    })

    it('should return success for valid data', () => {
      const validData = {
        username: 'test',
        password: 'pass',
      }

      const result = validateRequest(userSchemas.login, validData)
      
      expect(result.success).toBe(true)
    })
  })
})