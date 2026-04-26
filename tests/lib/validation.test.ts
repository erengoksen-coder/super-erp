import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

describe('Zod Validation Tests', () => {
  it('should validate a correct user object', () => {
    const validUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      age: 25,
    };
    
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should fail on invalid email', () => {
    const invalidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'invalid-email',
    };
    
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should fail if age is under 18', () => {
    const youngUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      age: 17,
    };
    
    const result = userSchema.safeParse(youngUser);
    expect(result.success).toBe(false);
  });
});
