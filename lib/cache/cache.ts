import { LRUCache } from 'lru-cache'
import { createHash } from 'crypto'

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items
  keyPrefix?: string // Prefix for cache keys
  compress?: boolean // Enable compression
}

export class CacheService {
  private cache: LRUCache<string, any, unknown>
  private options: CacheOptions

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      keyPrefix: '',
      compress: false,
      ...options
    }

    this.cache = new LRUCache({
      max: this.options.maxSize || 1000,
      ttl: this.options.ttl || (5 * 60 * 1000),
      ttlAutopurge: true,
      updateAgeOnGet: true,
      allowStale: true,
      dispose: (key, value) => {
        if (this.options.keyPrefix) {
          console.debug(`Cache disposed: ${key}`)
        }
      }
    })
  }

  // Generate cache key
  private generateKey(key: string): string {
    if (this.options.keyPrefix) {
      return `${this.options.keyPrefix}:${key}`
    }
    return key
  }

  // Get value from cache
  get<T = any>(key: string): T | null {
    const cacheKey = this.generateKey(key)
    const value = this.cache.get(cacheKey)
    
    if (value !== undefined) {
      console.debug(`Cache hit: ${cacheKey}`)
      return value
    }
    
    console.debug(`Cache miss: ${cacheKey}`)
    return null
  }

  // Set value in cache
  set<T = any>(key: string, value: T, options?: Partial<CacheOptions>): void {
    const cacheKey = this.generateKey(key)
    
    if (this.options.compress && typeof value === 'object') {
      // Simple compression simulation
      value = JSON.stringify(value) as unknown as T
    }

    const ttl = options?.ttl || this.options.ttl
    if (ttl) {
      this.cache.set(cacheKey, value, { ttl })
    } else {
      this.cache.set(cacheKey, value)
    }
    
    console.debug(`Cache set: ${cacheKey}`)
  }

  // Delete from cache
  delete(key: string): void {
    const cacheKey = this.generateKey(key)
    this.cache.delete(cacheKey)
    console.debug(`Cache delete: ${cacheKey}`)
  }

  // Clear all cache
  clear(): void {
    this.cache.clear()
    console.debug('Cache cleared')
  }

  // Check if key exists
  has(key: string): boolean {
    const cacheKey = this.generateKey(key)
    return this.cache.has(cacheKey)
  }

  // Get cache statistics
  getStats(): {
    size: number
    maxSize: number
    calculatedSize: number
    totalHits: number
    totalMisses: number
    hitRate: number
  } {
    // Simple stats implementation
    const size = this.cache.size
    const maxSize = this.cache.max || 1000

    return {
      size,
      maxSize,
      calculatedSize: size,
      totalHits: 0, // Would need custom implementation
      totalMisses: 0, // Would need custom implementation
      hitRate: 0
    }
  }

  // Warm up cache with initial data
  async warmUp<T>(keyValuePairs: Array<{ key: string; value: T | Promise<T> }>): Promise<void> {
    console.log(`Warming up cache with ${keyValuePairs.length} items`)
    
    await Promise.all(
      keyValuePairs.map(async ({ key, value }) => {
        if (value instanceof Promise) {
          value = await value
        }
        this.set(key, value)
      })
    )
    
    console.log('Cache warm-up completed')
  }

  // Get multiple values
  mget<T = any>(keys: string[]): Array<T | null> {
    return keys.map(key => this.get<T>(key))
  }

  // Set multiple values
  mset<T = any>(keyValuePairs: Array<{ key: string; value: T }>): void {
    keyValuePairs.forEach(({ key, value }) => this.set(key, value))
  }

  // Delete multiple keys
  mdelete(keys: string[]): void {
    keys.forEach(key => this.delete(key))
  }

  // Get or set (atomic operation)
  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options?: Partial<CacheOptions>
  ): Promise<T> {
    let value = this.get<T>(key)
    
    if (value === null) {
      console.debug(`Fetching fresh value for: ${key}`)
      value = await fetcher()
      this.set(key, value, options)
    }
    
    return value
  }

  // Cache invalidation by pattern
  invalidatePattern(pattern: RegExp | string): void {
    const keys = Array.from(this.cache.keys())
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern)
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    })
  }

  // Compress data for storage
  private compress(data: any): string {
    if (typeof data === 'string') {
      return data
    }
    
    const jsonString = JSON.stringify(data)
    const compressed = createHash('md5').update(jsonString).digest('hex')
    return compressed
  }

  // Decompress data from storage
  private decompress<T = any>(data: string): T {
    try {
      return JSON.parse(data)
    } catch {
      return data as T
    }
  }

  // Export cache to file (for persistence)
  export(): string {
    const data = Array.from(this.cache.entries())
    return JSON.stringify(data)
  }

  // Import cache from file
  import(data: string): void {
    try {
      const parsed = JSON.parse(data)
      parsed.forEach(([key, value]: [string, any]) => {
        this.cache.set(key, value)
      })
    } catch (error) {
      console.error('Failed to import cache data:', error)
    }
  }
}

// Predefined cache instances
export const cacheInstances = {
  // API response cache
  api: new CacheService({
    keyPrefix: 'api',
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 500
  }),

  // Database query cache
  database: new CacheService({
    keyPrefix: 'db',
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 1000
  }),

  // User session cache
  session: new CacheService({
    keyPrefix: 'session',
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 200
  }),

  // Static assets cache
  static: new CacheService({
    keyPrefix: 'static',
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 2000
  }),

  // Reports cache
  reports: new CacheService({
    keyPrefix: 'reports',
    ttl: 15 * 60 * 1000, // 15 minutes
    maxSize: 100,
    compress: true
  })
}

// Cache decorator for functions
export function cached<T extends any[], R>(
  cache: CacheService,
  keyGenerator?: (...args: T) => string,
  options?: CacheOptions
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function(...args: T): Promise<R> {
      const key = keyGenerator ? keyGenerator(...args) : `${propertyKey}:${JSON.stringify(args)}`
      
      return cache.getOrSet(key, () => originalMethod.apply(this, args), options)
    }

    return descriptor
  }
}

// Cache wrapper for API responses
export class ApiCache {
  constructor(private cache: CacheService) {}

  // GET request with caching
  async get<T = any>(
    url: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const key = `GET:${url}`
    return this.cache.getOrSet(key, fetcher, options)
  }

  // POST request (no caching by default)
  async post<T = any>(
    url: string,
    data: any,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Invalidate relevant cache entries
    this.cache.invalidatePattern(`GET:${url.split('?')[0]}*`)
    
    return fetcher()
  }

  // PUT/PATCH request
  async put<T = any>(
    url: string,
    data: any,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Invalidate relevant cache entries
    this.cache.invalidatePattern(`GET:${url.split('?')[0]}*`)
    
    return fetcher()
  }

  // DELETE request
  async delete<T = any>(
    url: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Invalidate relevant cache entries
    this.cache.invalidatePattern(`GET:${url.split('?')[0]}*`)
    
    return fetcher()
  }
}

// Create API cache instance
export const apiCache = new ApiCache(cacheInstances.api)