import { validateRequest, userSchemas, materialSchemas, accountSchemas, orderSchemas } from '../../lib/validation/schemas'

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

  describe('Account Schemas', () => {
    describe('create', () => {
      it('should validate correct account data', () => {
        const accountData = {
          name: ' Test Cari ',
          type: 'customer' as const,
          tax_number: '1234567890',
          email: 'cari@test.com',
        }
        const result = validateRequest(accountSchemas.create, accountData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.name).toBe('Test Cari')
          expect(result.data.type).toBe('customer')
        }
      })

      it('should reject empty name', () => {
        const result = validateRequest(accountSchemas.create, { name: '', type: 'customer' })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('Ad/Ünvan')
        }
      })

      it('should reject invalid type', () => {
        const result = validateRequest(accountSchemas.create, { name: 'Cari', type: 'invalid' })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Order Schemas', () => {
    const validCustomerId = '550e8400-e29b-41d4-a716-446655440000'
    const validProductId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    const validOrderDate = '2025-01-15T10:00:00.000Z'

    describe('create', () => {
      it('should validate correct order data', () => {
        const orderData = {
          customer_id: validCustomerId,
          order_date: validOrderDate,
          items: [
            { product_id: validProductId, quantity: 2, unit_price: 100 },
          ],
        }
        const result = validateRequest(orderSchemas.create, orderData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.items).toHaveLength(1)
          expect(result.data.items[0].quantity).toBe(2)
        }
      })

      it('should reject empty items', () => {
        const result = validateRequest(orderSchemas.create, {
          customer_id: validCustomerId,
          order_date: validOrderDate,
          items: [],
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('En az bir ürün')
        }
      })

      it('should reject invalid customer_id format', () => {
        const result = validateRequest(orderSchemas.create, {
          customer_id: 'not-a-uuid',
          order_date: validOrderDate,
          items: [{ product_id: validProductId, quantity: 1, unit_price: 50 }],
        })
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